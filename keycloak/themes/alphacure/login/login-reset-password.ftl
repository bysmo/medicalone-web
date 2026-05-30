<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "header">
        <!-- ═══ Logo AlphaCure ═══ -->
        <span style="display:block; text-align:center; margin-bottom: 1rem;">
            <img
                src="${url.resourcesPath}/img/logo.png"
                alt="AlphaCure"
                style="width: 72px; height: 72px; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(26,127,151,0.35));"
            />
        </span>
        ${msg("emailForgotTitle")}
    <#elseif section = "form">

        <!-- Instruction -->
        <p style="
            text-align: center;
            color: var(--ac-text-muted);
            font-size: 0.78rem;
            line-height: 1.6;
            margin-bottom: 1.75rem;
        ">
            Saisissez votre nom d'utilisateur ou adresse e-mail.<br/>
            Vous recevrez un lien pour réinitialiser votre mot de passe.
        </p>

        <form id="kc-reset-password-form" action="${url.loginAction}" method="post">
            <div class="form-group">
                <label for="username">
                    <#if !realm.loginWithEmailAllowed>
                        ${msg("username")}
                    <#elseif !realm.registrationEmailAsUsername>
                        ${msg("usernameOrEmail")}
                    <#else>
                        ${msg("email")}
                    </#if>
                </label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    autofocus
                    <#if messagesPerField.existsError('username')>aria-invalid="true"</#if>
                />
                <#if messagesPerField.existsError('username')>
                    <span id="input-error-username" aria-live="polite" style="color:var(--ac-red);font-size:0.72rem;margin-top:0.35rem;display:block;">
                        ${kcSanitize(messagesPerField.getFirstError('username'))?no_esc}
                    </span>
                </#if>
            </div>

            <!-- Bouton envoyer -->
            <div id="kc-form-buttons">
                <input
                    type="submit"
                    value="${msg("doSubmit")}"
                />
            </div>

            <!-- Retour à la connexion -->
            <div style="text-align:center; margin-top: 1.25rem;">
                <a href="${url.loginUrl}" style="font-size:0.75rem; font-weight:600;">
                    ← Retour à la connexion
                </a>
            </div>
        </form>

    <#elseif section = "info">
        <#if successPage??>
            <div style="text-align:center;color:rgba(100,190,141,0.9);font-size:0.8rem;margin-top:1rem;line-height:1.6;">
                ✓ Un e-mail de réinitialisation vous a été envoyé si votre compte existe.
            </div>
        </#if>
    </#if>
</@layout.registrationLayout>
