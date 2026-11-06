<script lang="ts">
  let { label, command }: { label: string; command: string } = $props();
  let status = $state('');

  async function copy() {
    try {
      await navigator.clipboard.writeText(command.replace(/\r?\n/g, '\r\n'));
      status = 'コピーしました';
    } catch {
      status = 'コピーできませんでした。コードを選択してコピーしてください。';
    }
  }
</script>

<div class="command-block">
  <div class="command-header">
    <span>{label}</span>
    <button type="button" onclick={copy} aria-label={`${label}をコピー`}>コピー</button>
  </div>
  <pre aria-label={label}><code>{command}</code></pre>
  <p class="copy-status" role="status">{status}</p>
</div>

<style>
  .command-block { margin: 1.25rem 0; min-width: 0; }
  .command-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-size: 0.85rem; font-weight: 600; }
  button { padding: 0.4rem 0.85rem; border-color: #aaa; font-size: 0.85rem; }
  pre { margin: 0.5rem 0 0; max-height: 32rem; border-color: #d4d4cf; border-radius: 6px; padding: 1rem; line-height: 1.65; white-space: pre; overflow-wrap: normal; tab-size: 4; }
  code { font-family: ui-monospace, Consolas, monospace; }
  .copy-status { min-height: 1.5em; margin: 0.25rem 0 0; font-size: 0.8rem; color: #315f46; }
</style>
