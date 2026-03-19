import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "./TicketGenerated.css";

const VENDOR_ID = 0x1fc9;

async function printTicket(ticketData: {
    numero_ticket: string;
    service_name: string;
    priority: string;
    agence_name?: string;
    created_at?: string;
    people_waiting: number;
}): Promise<void> {
    let device: any = null;

    try {
        const nav = navigator as any;
        if (!nav.usb) {
            console.warn("WebUSB non supporté sur ce navigateur");
            return;
        }

        // Tenter de trouver une imprimante déjà autorisée
        const devices = await nav.usb.getDevices();
        device = devices.find((d: any) => d.vendorId === VENDOR_ID);

        if (!device) {
            console.warn("Imprimante non associée. Un administrateur doit cliquer sur 'Associer l'imprimante'.");
            return;
        }

        // Configuration de l'appareil
        await device.open();
        if (device.configuration === null) {
            await device.selectConfiguration(1);
        }
        await device.claimInterface(0);

        // Préparation du contenu du ticket
        const encoder = new TextEncoder();
        let text = "\x1B\x40"; // Initialiser l'imprimante (ESC @)

        // --- En-tête ---
        text += "\x1B\x61\x01"; // Centrer le texte (ESC a 1)
        text += "\x1B\x45\x01"; // Gras activé (ESC E 1)
        text += "BAOBAB TICKET\n";
        text += "\x1B\x45\x00"; // Gras désactivé
        text += "--------------------------------\n\n";

        // --- Votre Numéro (Encore plus gros et Centré) ---
        text += "VOTRE NUMERO\n";
        text += "\x1D\x21\x22"; // Taille x3 largeur et hauteur (GS ! 34 = 0x22)
        text += "\x1B\x45\x01"; // Gras activé
        text += `${ticketData.numero_ticket}\n`;
        text += "\x1B\x45\x00"; // Gras désactivé
        text += "\x1D\x21\x00"; // Taille normale (GS ! 0)
        text += "\n--------------------------------\n\n";

        // --- Détails (Aligné à gauche) ---
        text += "\x1B\x61\x00"; // Aligner à gauche (ESC a 0)
        text += `Service : ${ticketData.service_name || 'N/A'}\n`;
        text += `Priorite: ${ticketData.priority || 'Normal'}\n`;
        if (ticketData.agence_name) text += `Agence  : ${ticketData.agence_name}\n`;

        text += `Personnes avant vous : ${ticketData.people_waiting}\n\n`;

        // --- Pied de page (Centré) ---
        text += "\x1B\x61\x01"; // Centrer le texte
        const dateString = ticketData.created_at
            ? new Date(ticketData.created_at).toLocaleString('fr-FR')
            : new Date().toLocaleString('fr-FR');
        text += `Heure   : ${dateString}\n`;
        text += "Merci de patienter.\n";

        text += "\n\n\n\n"; // Espaces pour la coupe

        // Commande ESC/POS de coupe (GS V 66 0)
        const cutCommand = new Uint8Array([0x1d, 0x56, 0x42, 0x00]);

        const textData = encoder.encode(text);
        const fullData = new Uint8Array(textData.length + cutCommand.length);
        fullData.set(textData);
        fullData.set(cutCommand, textData.length);

        // Envoi vers le endpoint USB
        await device.transferOut(1, fullData);
        console.log("Ticket imprimé et coupé via WebUSB !");

    } catch (error) {
        console.warn("Erreur d'impression WebUSB :", error);
        throw error; // Relancer pour que l'UI sache que ça a échoué
    } finally {
        // IMPORTANT: Toujours libérer l'interface et fermer l'appareil précis qu'on a ouvert
        // Sinon, au débranchement/rebranchement l'état reste bloqué sur la tablette
        if (device && device.opened) {
            try {
                await device.releaseInterface(0).catch(() => { });
                await device.close().catch(() => { });
                console.log("Appareil USB fermé proprement");
            } catch (closeError) {
                console.log("Erreur lors de la fermeture de l'appareil", closeError);
            }
        }
    }
}

import { supabase } from "../../../../shared/api/supabaseClient";
import { getPriorityWeight } from "../../../../shared/utils/priorityUtils";

export const TicketGenerated: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState(15);
    const [peopleWaiting, setPeopleWaiting] = useState<number>(0);
    const [printStatus, setPrintStatus] = useState<string>("");
    const [hasPrinted, setHasPrinted] = useState<boolean>(false); // Suivre l'état d'impression
    const [isFullscreen, setIsFullscreen] = useState(false);
    const currentTime = new Date();
    const navigate = useNavigate();
    const location = useLocation();

    // Écouteur pour le plein écran
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };
    const { slug } = useParams<{ slug: string }>();

    const basePath = slug ? `/${slug}/borne` : "/ticket";
    const { ticket, serviceName, priorityName, agenceName } = location.state || {};

    const attemptPrint = React.useCallback(async (waitingCount: number = peopleWaiting) => {
        if (!ticket || hasPrinted) return;

        try {
            const nav = navigator as any;
            if (nav.usb) {
                const devices = await nav.usb.getDevices();
                const device = devices.find((d: any) => d.vendorId === VENDOR_ID);
                if (device) {
                    setPrintStatus("Impression en cours...");
                    await printTicket({
                        numero_ticket: ticket.numero_ticket,
                        service_name: serviceName || "N/A",
                        priority: priorityName || ticket.niveau || "Normal",
                        agence_name: agenceName,
                        created_at: ticket.created_at,
                        people_waiting: waitingCount,
                    });
                    setPrintStatus("Impression réussie !");
                    setHasPrinted(true);
                } else {
                    setPrintStatus("Imprimante non détectée");
                }
            } else {
                setPrintStatus("USB non supporté (vérifiez HTTPS/flags)");
            }
        } catch (e: any) {
            setPrintStatus(`Erreur d'impression: ${e.message || "Échec"}`);
            setHasPrinted(false);
        }
    }, [ticket, serviceName, priorityName, agenceName, peopleWaiting, hasPrinted]);


    const handleManualPrint = async () => {
        if (!ticket) return;
        setPrintStatus("Recherche de l'imprimante...");

        try {
            const nav = navigator as any;
            if (!nav.usb) {
                setPrintStatus("WebUSB non supporté");
                return;
            }

            let device;
            try {
                device = await nav.usb.requestDevice({ filters: [{ vendorId: VENDOR_ID }] });
            } catch (e) {
                const devices = await nav.usb.getDevices();
                device = devices.find((d: any) => d.vendorId === VENDOR_ID);
            }

            if (!device) {
                setPrintStatus("Imprimante non détectée");
                return;
            }

            await attemptPrint(peopleWaiting);
        } catch (error: any) {
            setPrintStatus(`Erreur: ${error.message || "USB"}`);
        }
    };

    useEffect(() => {
        const nav = navigator as any;
        if (!nav.usb) return;

        const handleConnect = (event: any) => {
            if (event.device.vendorId === VENDOR_ID) {
                console.log("Imprimante connectée", event.device);
                setPrintStatus("Imprimante ré-détectée, tentative d'impression...");
                // Petit délai pour laisser le port s'initialiser au niveau OS
                setTimeout(() => {
                    if (!hasPrinted) {
                        attemptPrint();
                    }
                }, 1000);
            }
        };

        const handleDisconnect = (event: any) => {
            if (event.device.vendorId === VENDOR_ID) {
                console.log("Imprimante déconnectée");
                setPrintStatus("Imprimante déconnectée. Veuillez brancher le câble.");
            }
        };

        nav.usb.addEventListener("connect", handleConnect);
        nav.usb.addEventListener("disconnect", handleDisconnect);

        return () => {
            nav.usb.removeEventListener("connect", handleConnect);
            nav.usb.removeEventListener("disconnect", handleDisconnect);
        };
    }, [attemptPrint, hasPrinted]);

    useEffect(() => {
        console.log("USB disponible :", !!(navigator as any).usb);
        if (!ticket || hasPrinted) return;

        const fetchAndPrint = async () => {
            let waitingCount = 0;

            // Calcul du nombre de personnes devant ce ticket en tenant compte de la priorité
            const ticketPriority = getPriorityWeight(ticket.niveau || "Normal");

            // 1. Compter les tickets de priorité strictement supérieure (ils passent tous avant)
            // On inclut les deux casses possibles (anciens tickets en minuscule + nouveaux en majuscule)
            const higherPriorityLevels: string[] = [];
            if (ticketPriority > 0) higherPriorityLevels.push("VIP", "vip");
            if (ticketPriority > 1) higherPriorityLevels.push("Urgent", "urgent");

            let higherCount = 0;
            if (higherPriorityLevels.length > 0) {
                const { count: hc, error: hErr } = await supabase
                    .from("ticket")
                    .select("id", { count: "exact" })
                    .eq("service_id", ticket.service_id)
                    .eq("status", "waiting")
                    .in("niveau", higherPriorityLevels);

                if (!hErr && hc !== null) {
                    higherCount = hc;
                }
            }

            // 2. Compter les tickets de même priorité créés avant celui-ci
            // Inclure les deux casses pour le niveau actuel
            const currentLevel = ticket.niveau || "Normal";
            const sameLevelVariants = [currentLevel, currentLevel.toLowerCase(), currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1).toLowerCase()];
            const uniqueVariants = [...new Set(sameLevelVariants)];

            const { count: sameCount, error: sErr } = await supabase
                .from("ticket")
                .select("id", { count: "exact" })
                .eq("service_id", ticket.service_id)
                .eq("status", "waiting")
                .in("niveau", uniqueVariants)
                .lt("created_at", ticket.created_at);

            if (!sErr && sameCount !== null) {
                waitingCount = higherCount + sameCount;
            } else {
                waitingCount = higherCount;
            }

            // 3. Diviser par le nombre de guichets actifs qui servent ce service
            // pour donner une estimation réaliste du temps d'attente
            try {
                // Récupérer les guichets actuellement occupés par des agents pour cette agence
                const { data: activeGuichets } = await supabase
                    .from("active_guichets")
                    .select("nom_guichet")
                    .eq("agence_id", ticket.agence_id);

                if (activeGuichets && activeGuichets.length > 0) {
                    // Parmi ces guichets actifs, compter ceux qui servent le service de ce ticket
                    const activeNames = activeGuichets.map(g => g.nom_guichet);
                    const { data: servingGuichets } = await supabase
                        .from("guichet_service")
                        .select("nom_guichet")
                        .eq("service_id", ticket.service_id)
                        .eq("agence_id", ticket.agence_id)
                        .in("nom_guichet", activeNames);

                    const activeCount = servingGuichets?.length || 1;
                    if (activeCount > 1) {
                        waitingCount = Math.ceil(waitingCount / activeCount);
                    }
                }
            } catch (guichetError) {
                console.warn("Erreur lors du calcul des guichets actifs:", guichetError);
                // En cas d'erreur, on garde le waitingCount brut
            }

            setPeopleWaiting(waitingCount);

            await attemptPrint(waitingCount);
        };

        fetchAndPrint();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Compte à rebours pour retour automatique à la borne ──────────────────
    useEffect(() => {
        if (timeLeft <= 0) {
            navigate(basePath);
            return;
        }
        const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, navigate]);

    // Retiré le bouton pour associer l'imprimante manuellement selon la demande de l'utilisateur

    if (!ticket) {
        return (
            <div className="kiosk-container ticket-generated-page">
                <main className="kiosk-main">
                    <h2 className="ticket-title">Aucun ticket trouvé</h2>
                    <button className="home-button" onClick={() => navigate(basePath)}> Retour </button>
                </main>
            </div>
        );
    }

    return (
        <div className="kiosk-container ticket-generated-page">
            <div className="kiosk-bg-decorator shape-1"></div>
            <div className="kiosk-bg-decorator shape-2"></div>
            <div className="kiosk-bg-decorator shape-3"></div>

            {/* Bouton Plein Écran Discret */}
            <button 
                className="kiosk-fullscreen-btn" 
                onClick={toggleFullscreen}
                title={isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"}
            >
                {isFullscreen ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                    </svg>
                )}
            </button>

            <header className="kiosk-header">
                <div className="kiosk-logo-group">
                    <div className="kiosk-logo-circle">
                        <span className="kiosk-logo-letter">B</span>
                    </div>
                    <div className="kiosk-logo-text-col">
                        <h1 className="kiosk-logo-title">Baobab Ticket</h1>
                        <p className="kiosk-logo-subtitle">Ticket Confirmé</p>
                    </div>
                </div>
                <div className="kiosk-time-display">
                    {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
            </header>

            <main className="kiosk-main">
                <div className="success-icon-wrapper">
                    <div className="success-circle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="check-icon">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                </div>

                <div className="ticket-header-text">
                    <h2 className="ticket-title">Merci ! Ticket généré</h2>
                    <p className="ticket-subtitle">Veuillez vous diriger vers la salle d'attente</p>
                </div>

                <div className="ticket-card-container">
                    <div className="ticket-card">
                        <div className="ticket-number-section">
                            <span className="label-small">VOTRE NUMÉRO</span>
                            <h3 className="ticket-big-number">{ticket.numero_ticket}</h3>
                        </div>
                        <div className="ticket-details-grid">
                            <div className="detail-item">
                                <span className="label-tiny">SERVICE</span>
                                <span className="value-normal">{serviceName || "Banque"}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label-tiny">NIVEAU</span>
                                <span className="priority-badge" data-priority={ticket.niveau}>{priorityName || "Normal"}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label-tiny">HEURE</span>
                                <span className="value-normal">{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                        <div className="ticket-footer-strip">
                            <div className="dots-line"></div>
                            <p className="footer-message">Heure : {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                    {printStatus && (
                        <div style={{
                            padding: '0.4rem 1rem',
                            borderRadius: '20px',
                            background: printStatus.includes('Erreur') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: printStatus.includes('Erreur') ? '#ef4444' : '#10b981',
                            fontSize: '0.9rem',
                            fontWeight: '500'
                        }}>
                            {printStatus}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="confirm-button" onClick={handleManualPrint} style={{ minWidth: '200px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', marginRight: '8px' }}>
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect x="6" y="14" width="12" height="8" />
                            </svg>
                            <span>Imprimer le ticket</span>
                        </button>

                        <button className="home-button" onClick={() => navigate(basePath)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="back-arrow">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            <span>Terminer ({timeLeft}s)</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};
