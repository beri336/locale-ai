<!-- src/components/faq/Faq.vue -->

<template>
  <main class="faq-view">
    <header class="page-header">
      <div class="page-heading">
        <div class="header-icon" aria-hidden="true">
          <IconFaq />
        </div>

        <div>
          <p class="eyebrow">Help & Setup</p>
          <h1>FAQ</h1>
          <p class="header-description">
            Connect your app securely to Ollama on the local network.
          </p>
        </div>
      </div>
    </header>

    <div class="faq-content">
      <section
        v-for="item in faqItems"
        :key="item.id"
        class="faq-card"
        :class="{ 'is-open': openSections[item.id] }"
      >
        <button
          class="faq-question"
          type="button"
          :aria-expanded="openSections[item.id]"
          :aria-controls="`faq-${item.id}`"
          @click="toggle(item.id)"
        >
          <span class="question-icon" aria-hidden="true">
            <component :is="item.icon" :size="20" :stroke-width="1.8" />
          </span>

          <span class="question-content">
            <span class="question-title">{{ item.title }}</span>
            <span class="question-subtitle">{{ item.subtitle }}</span>
          </span>

          <span class="chevron" :class="{ open: openSections[item.id] }">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
              />
            </svg>
          </span>
        </button>

        <Transition name="accordion">
          <div
            v-if="openSections[item.id]"
            :id="`faq-${item.id}`"
            class="faq-answer"
          >
            <template v-if="item.id === 'mobile'">
              <div class="intro-box">
                <IconInfoCircle
                  class="intro-icon"
                  :size="18"
                  :stroke-width="1.8"
                />
                <p>
                  In order for another device to access your app and Ollama,
                  both the Vite server and the Ollama API must be accessible on
                  the local network.
                </p>
              </div>

              <div class="steps">
                <article class="step">
                  <span class="step-number">1</span>
                  <div>
                    <h3>Find the IP Address of the Host Computer</h3>
                    <p>
                      Run on the computer where Vite and/or Ollama are running:
                    </p>

                    <CodeBlock>
                      Windows: ipconfig macOS / Linux: ifconfig or ip
                      a</CodeBlock
                    >

                    <p class="muted">
                      Search for the IPv4 address, for example
                      <code>192.168.1.50</code>.
                    </p>
                  </div>
                </article>

                <article class="step">
                  <span class="step-number">2</span>
                  <div>
                    <h3>Make Ollama Accessible on the Network</h3>
                    <p>
                      By default, Ollama is only accessible via
                      <code>localhost</code>. Set the following variables on the
                      computer where Ollama is running:
                    </p>

                    <div class="platform-grid">
                      <div class="platform-card">
                        <span class="platform-label">Windows</span><br />
                        <CodeBlock
                          >setx OLLAMA_HOST "0.0.0.0:11434" setx OLLAMA_ORIGINS
                          "*"</CodeBlock
                        >
                      </div>

                      <div class="platform-card">
                        <span class="platform-label">macOS</span><br />
                        <CodeBlock
                          >launchctl setenv OLLAMA_HOST "0.0.0.0:11434"
                          launchctl setenv OLLAMA_ORIGINS "*"</CodeBlock
                        >
                      </div>

                      <div class="platform-card">
                        <span class="platform-label">Linux</span><br />
                        <CodeBlock
                          >export OLLAMA_HOST="0.0.0.0:11434" export
                          OLLAMA_ORIGINS="*" ollama serve</CodeBlock
                        >
                      </div>
                    </div>

                    <p class="muted">Start Ollama completely anew afterward.</p>
                  </div>
                </article>

                <article class="step">
                  <span class="step-number">3</span>
                  <div>
                    <h3>Check the Firewall</h3>
                    <p>
                      Allow incoming TCP connections for port
                      <code>11434</code>. On Windows, this usually requires an
                      incoming firewall rule. für Port <code>11434</code>. Unter
                      Windows ist dafür meist eine eingehende Firewall-Regel
                      nötig.
                    </p>
                  </div>
                </article>

                <article class="step">
                  <span class="step-number">4</span>
                  <div>
                    <h3>Enter the API Address in the App</h3>
                    <p>
                      Open the
                      <router-link to="/settings">Settings</router-link>
                      and enter the address of the Ollama computer under
                      <strong>API URL</strong>:
                    </p>

                    <CodeBlock>http://192.168.1.50:11434</CodeBlock>
                  </div>
                </article>

                <article class="step">
                  <span class="step-number">5</span>
                  <div>
                    <h3>Open the App on the Other Device</h3>
                    <p>
                      Start Vite with network access and open the displayed
                      address on your smartphone or laptop:
                    </p>

                    <CodeBlock
                      >npm run dev -- --host http://192.168.1.50:5173</CodeBlock
                    >
                  </div>
                </article>
              </div>

              <aside class="notice notice-warning">
                <IconAlertTriangle
                  class="notice-icon warning-icon"
                  :size="18"
                  :stroke-width="1.8"
                />
                <p>
                  Both devices must be on the same local network. Guest WLANs,
                  VPNs or Client-Isolation in the router can prevent the
                  connection.
                </p>
              </aside>
            </template>

            <template v-else>
              <div class="intro-box">
                <IconBulb class="intro-icon" :size="18" :stroke-width="1.8" />
                <p>
                  The key point is not where the website is running, but rather
                  which device the browser should use to call the Ollama API.
                </p>
              </div>

              <div class="scenario-grid">
                <article class="scenario-card">
                  <div class="scenario-header">
                    <span class="scenario-badge">Scenario A</span>
                    <h3>Ollama runs on the Host Computer</h3>
                  </div>

                  <p>
                    Computer A hosts the App and Ollama. Computer B opens the
                    App via the network IP of Computer A.
                  </p>

                  <CodeBlock
                    >API-URL: http://&lt;Computer-IP-Address-A&gt;:11434</CodeBlock
                  >

                  <p class="muted">
                    On computer A, configure <code>OLLAMA_HOST</code>, CORS and
                    the firewall rules.
                  </p>
                </article>

                <article class="scenario-card">
                  <div class="scenario-header">
                    <span class="scenario-badge">Scenario B</span>
                    <h3>Ollama runs locally on Computer B</h3>
                  </div>

                  <p>
                    The app is hosted on Computer A, but you open it in a
                    browser on Computer B. Ollama is also running on B.
                  </p>

                  <CodeBlock>API-URL: http://localhost:11434</CodeBlock>

                  <p class="muted">
                    <code>localhost</code> always refers to the machine where
                    your browser is currently running.
                  </p>
                </article>
              </div>

              <aside class="notice notice-info">
                <IconKey class="notice-icon" :size="18" :stroke-width="1.8" />
                <p>
                  The API-URL must always point to the machine where Ollama is
                  actually running. The hosting location of the Vue app is
                  independent of this.
                </p>
              </aside>

              <div class="diagnostic-card">
                <div>
                  <p class="eyebrow">Quick Diagnosis</p>
                  <h3>Check the Ollama connection directly</h3>
                  <p>
                    Run the command on the device where you're using the app in
                    the browser.
                  </p>
                </div>

                <CodeBlock
                  >curl http://&lt;destination-IP&gt;:11434/api/tags</CodeBlock
                >

                <p class="muted">
                  A JSON response means: Ollama is reachable. In case of timeout
                  or "Connection refused", check IP, firewall, Ollama host and
                  network.
                </p>
              </div>
            </template>
          </div>
        </Transition>
      </section>
    </div>
  </main>
</template>

<script setup>
import { reactive } from "vue";
import IconFaq from "@/components/icons/IconFaq.vue";
import {
  IconInfoCircle,
  IconAlertTriangle,
  IconBulb,
  IconKey,
  IconDeviceMobile,
  IconBrandWindows,
} from "@tabler/icons-vue";

const openSections = reactive({
  mobile: false,
  windows: false,
});

const faqItems = [
  {
    id: "mobile",
    icon: IconDeviceMobile,
    title: "Access from a smartphone or network device",
    subtitle: "Make Vite and Ollama reachable in the local network",
  },
  {
    id: "windows",
    icon: IconBrandWindows,
    title: "Test on a different Windows computer",
    subtitle: "Find the correct API URL for your specific setup",
  },
];

function toggle(key) {
  openSections[key] = !openSections[key];
}
</script>

<style scoped>
.faq-view {
  height: 100%;
  overflow-y: auto;
  padding: clamp(1.5rem, 4vw, 3rem);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  max-width: 1100px;
  margin-bottom: 2rem;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.header-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
  border-radius: 14px;
}

.header-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.eyebrow {
  margin: 0 0 0.25rem;
  color: var(--color-text-faint);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.header-description {
  margin: 0.5rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.faq-content {
  display: grid;
  max-width: 880px;
  gap: 0.75rem;
}

.faq-card {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.03);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.faq-card:hover,
.faq-card.is-open {
  border-color: color-mix(
    in srgb,
    var(--color-primary) 35%,
    var(--color-border)
  );
}

.faq-card.is-open {
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.05);
}

.faq-question {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.9rem;
  padding: 1.1rem 1.25rem;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.faq-question:hover .question-title {
  color: var(--color-primary);
}

:deep(svg) {
  width: 1em;
  height: 1em;
}

.faq-question :deep(svg),
.intro-box :deep(svg),
.notice :deep(svg) {
  width: 1em;
  height: 1em;
}

.question-icon :deep(svg) {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.question-icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  background: var(--color-surface-2);
  border-radius: 11px;
}

.question-content {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
}

.question-title {
  font-size: var(--text-sm);
  font-weight: 650;
  transition: color 0.2s ease;
}

.question-subtitle {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.4;
}

.chevron {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  margin-left: auto;
  place-items: center;
  color: var(--color-text-faint);
  background: var(--color-surface-2);
  border-radius: 50%;
  transition: transform 0.25s ease;
}

.chevron svg {
  width: 16px;
  height: 16px;
}

.chevron.open {
  transform: rotate(180deg);
}

.faq-answer {
  padding: 0 1.25rem 1.25rem;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.65;
}

.intro-box,
.notice,
.diagnostic-card,
.scenario-card {
  border-radius: var(--radius-md);
}

.intro-box {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 1rem;
  margin: 0.25rem 0 1.5rem;
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.intro-box p,
.notice p,
.scenario-card p,
.diagnostic-card p {
  margin: 0;
}

.intro-icon {
  line-height: 1.5;
}

.steps {
  display: grid;
  gap: 1.5rem;
}

.step {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 0.85rem;
}

.step-number {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 750;
  background: color-mix(in srgb, var(--color-primary) 13%, transparent);
  border-radius: 50%;
}

.faq-answer h3 {
  margin: 0 0 0.35rem;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 650;
}

.faq-answer p + p {
  margin-top: 0.65rem;
}

.platform-grid,
.scenario-grid {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.platform-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.platform-card,
.scenario-card {
  padding: 0.9rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.platform-label,
.scenario-badge {
  display: inline-flex;
  margin-bottom: 0.65rem;
  color: var(--color-text);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.scenario-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 1rem;
}

.scenario-header {
  margin-bottom: 0.7rem;
}

.scenario-badge {
  padding: 0.2rem 0.45rem;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border-radius: 999px;
}

.muted {
  color: var(--color-text-faint);
  font-size: var(--text-xs);
}

.faq-answer code {
  padding: 0.12rem 0.35rem;
  color: var(--color-text);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 0.85em;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 5px;
}

.faq-answer pre {
  padding: 0.85rem 1rem;
  margin: 0.75rem 0;
  overflow-x: auto;
  color: #e6edf3;
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 0.76rem;
  line-height: 1.65;
  background: #0d1117;
  border: 1px solid rgb(255 255 255 / 0.07);
  border-radius: var(--radius-md);
}

.faq-answer pre code {
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
}

.notice {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.9rem 1rem;
  margin-top: 1.5rem;
  font-size: var(--text-xs);
  line-height: 1.55;
}

.notice-warning {
  background: color-mix(in srgb, #f59e0b 10%, var(--color-surface));
  border: 1px solid color-mix(in srgb, #f59e0b 28%, var(--color-border));
}

.notice-info {
  background: color-mix(in srgb, var(--color-primary) 9%, var(--color-surface));
  border: 1px solid
    color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
}

.diagnostic-card {
  padding: 1.1rem;
  margin-top: 1rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.accordion-enter-active,
.accordion-leave-active {
  overflow: hidden;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.accordion-enter-from,
.accordion-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.question-icon,
.intro-icon,
.notice-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.question-icon :deep(svg),
.intro-icon,
.notice-icon,
.faq-icon :deep(svg) {
  display: block;
  flex-shrink: 0;
}

@media (max-width: 680px) {
  .faq-view {
    padding: 1.25rem 1rem 2rem;
  }

  .page-header {
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .header-icon {
    width: 40px;
    height: 40px;
  }

  .faq-question {
    padding: 1rem;
  }

  .faq-answer {
    padding: 0 1rem 1rem;
  }

  .question-subtitle {
    display: none;
  }

  .platform-grid,
  .scenario-grid {
    grid-template-columns: 1fr;
  }
}
</style>
