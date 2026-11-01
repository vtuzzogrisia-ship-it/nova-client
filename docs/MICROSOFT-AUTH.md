# Configurare il login Microsoft per NOVA CLIENT

NOVA usa un'applicazione Microsoft Entra registrata come **client pubblico desktop**. Non creare un client secret: un launcher distribuito agli utenti non può custodire segreti condivisi.

## 1. Registra l'app

1. Apri [Microsoft Entra admin center](https://entra.microsoft.com/).
2. Vai in **Identity > Applications > App registrations > New registration**.
3. Nome: `NOVA CLIENT`.
4. Tipi di account supportati: **Accounts in any organizational directory and personal Microsoft accounts** (serve per gli account Microsoft personali usati anche con Xbox/Minecraft).
5. Per ora lascia vuoto Redirect URI e premi **Register**.
6. Dalla pagina **Overview**, copia **Application (client) ID**.

## 2. Abilita il client pubblico

1. Apri **Authentication** nella registrazione.
2. Aggiungi la piattaforma **Mobile and desktop applications**.
3. Seleziona il redirect nativo suggerito oppure `https://login.microsoftonline.com/common/oauth2/nativeclient`.
4. In **Advanced settings**, abilita **Allow public client flows** se richiesto dal flusso di autenticazione configurato.
5. Salva.

Non creare né inviare a NOVA un Client Secret. Non condividere password o codici di accesso.

## 3. Passa il Client ID al progetto

Invia al manutentore NOVA soltanto il valore **Application (client) ID** (è un identificatore pubblico, non una password). Non inviare screenshot con dati personali, password, token o secret.

## Note tecniche e stato

- Per app desktop Microsoft raccomanda un flusso di autenticazione interattivo da client pubblico; i flussi OAuth con PKCE sono preferibili dove applicabili.
- Il redirect URI deve corrispondere esattamente a uno configurato nella registrazione.
- Il login Microsoft da solo non autentica Minecraft: NOVA deve completare anche gli scambi Xbox Live/XSTS e Minecraft Services e verificare il profilo/licenza prima di abilitare l'avvio.
- Il login non è considerato completato finché l'intero percorso Microsoft → Xbox → Minecraft non è stato testato.

Riferimenti ufficiali:
- [Registrare un'app Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [Configurare URI di reindirizzamento](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri)
- [Configurare app desktop](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-desktop-app-configuration)
