<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        <!-- ═══ Logo AlphaCure ═══ -->
        <span style="display:block; text-align:center; margin-bottom: 1rem;">
            <img
                src="${url.resourcesPath}/img/logo.png"
                alt="AlphaCure"
                style="width: 72px; height: 72px; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(26,127,151,0.35));"
            />
        </span>
        ${msg("loginAccountTitle")}
    <#elseif section = "form">

        <#if realm.password>
            <form id="kc-form-login" onsubmit="return true;" action="${url.loginAction}" method="post">
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
                        tabindex="1"
                        id="username"
                        name="username"
                        type="text"
                        autofocus
                        autocomplete="off"
                        <#if messagesPerField.existsError('username','password')>
                            aria-invalid="true"
                        </#if>
                    />
                    <#if messagesPerField.existsError('username','password')>
                        <span id="input-error" aria-live="polite" style="color:var(--ac-red);font-size:0.72rem;margin-top:0.35rem;display:block;">
                            ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                        </span>
                    </#if>
                </div>

                <div class="form-group">
                    <label for="password">${msg("password")}</label>
                    <div style="position:relative;">
                        <input
                            tabindex="2"
                            id="password"
                            name="password"
                            type="password"
                            autocomplete="off"
                            style="padding-right: 2.8rem;"
                        />
                        <!-- Toggle visibilité mot de passe -->
                        <button
                            type="button"
                            onclick="var p=document.getElementById('password');p.type=p.type==='password'?'text':'password';"
                            style="position:absolute;right:0.75rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--ac-text-muted);padding:0;line-height:1;"
                            tabindex="-1"
                            aria-label="Afficher/Masquer le mot de passe"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Se souvenir / Mot de passe oublié -->
                <div class="login-pf-settings">
                    <#if realm.rememberMe && !usernameEditDisabled??>
                        <div class="checkbox">
                            <label>
                                <#if login.rememberMe??>
                                    <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked> ${msg("rememberMe")}
                                <#else>
                                    <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"> ${msg("rememberMe")}
                                </#if>
                            </label>
                        </div>
                    </#if>
                    <#if realm.resetPasswordAllowed>
                        <a tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
                    </#if>
                </div>

                <!-- Bouton connexion -->
                <div id="kc-form-buttons">
                    <input
                        tabindex="4"
                        id="kc-login"
                        name="login"
                        type="submit"
                        value="${msg("doLogIn")}"
                    />
                </div>
            </form>
        </#if>

    <#elseif section = "info">
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration">
                <span>
                    ${msg("noAccount")}
                    <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a>
                </span>
            </div>
        </#if>
    </#if>
</@layout.registrationLayout>
