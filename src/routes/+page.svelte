<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import type { PollView, VoteReceipt } from '../../shared/types';
  import { ApiError, apiRequest } from '$lib/api';

  type Screen = 'loading' | 'pin' | 'vote' | 'thanks' | 'cancelled';

  let screen: Screen = 'loading';
  let pin = '';
  let poll: PollView | null = null;
  let receipt: VoteReceipt | null = null;
  let submitting = false;
  let error = '';
  let returnTimer: number | undefined;
  let pollLoadedAt = 0;
  let confirmation: HTMLDialogElement;
  let lastVoteButton: HTMLButtonElement | null = null;

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  async function loadPoll() {
    error = '';
    try {
      poll = await apiRequest<PollView>('/api/poll');
      pollLoadedAt = Date.now();
      screen = 'vote';
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        screen = 'pin';
      } else {
        error = cause instanceof Error ? cause.message : '読み込みに失敗しました';
        screen = 'pin';
      }
    }
  }

  async function login() {
    if (pin.length !== 4 || submitting) return;
    submitting = true;
    error = '';
    try {
      const data = await apiRequest<{ role: 'voter'; poll: PollView }>('/api/auth/voter', {
        method: 'POST',
        body: JSON.stringify({ pin })
      });
      pin = '';
      poll = data.poll;
      pollLoadedAt = Date.now();
      screen = 'vote';
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '認証に失敗しました';
    } finally {
      submitting = false;
    }
  }

  async function vote(optionId: string, button: HTMLButtonElement) {
    if (submitting) return;
    lastVoteButton = button;
    submitting = true;
    error = '';
    try {
      receipt = await apiRequest<VoteReceipt>('/api/votes', {
        method: 'POST',
        body: JSON.stringify({ optionId, requestId: crypto.randomUUID() })
      });
      screen = 'thanks';
      await tick();
      confirmation.showModal();
      scheduleReturn();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '投票に失敗しました';
      await loadPoll();
    } finally {
      submitting = false;
    }
  }

  async function cancelVote() {
    if (!receipt || submitting) return;
    submitting = true;
    error = '';
    clearReturnTimer();
    try {
      await apiRequest(`/api/votes/${receipt.voteId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancelToken: receipt.cancelToken })
      });
      receipt = null;
      screen = 'cancelled';
      scheduleReturn();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '取消に失敗しました';
      scheduleReturn();
    } finally {
      submitting = false;
    }
  }

  function scheduleReturn() {
    clearReturnTimer();
    returnTimer = window.setTimeout(returnToVote, 3500);
  }

  function clearReturnTimer() {
    if (returnTimer !== undefined) window.clearTimeout(returnTimer);
    returnTimer = undefined;
  }

  function returnToVote() {
    clearReturnTimer();
    confirmation.close();
    lastVoteButton?.focus({ preventScroll: true });
    receipt = null;
    screen = 'vote';
    if (Date.now() - pollLoadedAt >= 60_000) {
      void loadPoll();
      return;
    }
    if (poll?.closesAt && Date.now() >= new Date(poll.closesAt).getTime()) {
      poll = { ...poll, status: 'closed', acceptingVotes: false };
    }
    screen = 'vote';
  }

  onMount(() => {
    void loadPoll();
  });
  onDestroy(clearReturnTimer);
</script>

<main class="page voter-page" class:ballot-view={poll && screen !== 'pin' && screen !== 'loading'}>
  {#if screen === 'loading'}
    <p>読み込み中</p>
  {:else if screen === 'pin'}
    <h1>投票</h1>
    <form on:submit|preventDefault={login} class="stack">
      <div class="field">
        <label for="pin">PIN</label>
        <input
          id="pin"
          type="password"
          inputmode="numeric"
          pattern="[0-9][0-9][0-9][0-9]"
          maxlength="4"
          autocomplete="off"
          bind:value={pin}
          required
        />
      </div>
      <button class="primary" type="submit" disabled={submitting || pin.length !== 4}>開く</button>
    </form>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  {:else if poll}
    <header class="ballot-header">
      <h1>{poll.title}</h1>
      {#if poll.closesAt}
        <p class="muted">受付期限: {formatDate(poll.closesAt)}</p>
      {/if}
    </header>
    {#if poll.status === 'open' && poll.options.length > 0}
      <div class="choices" aria-label="投票先">
        {#each poll.options as option (option.id)}
          <button class="primary choice" type="button" on:click={(event) => vote(option.id, event.currentTarget)} disabled={submitting}>
            {option.label}
          </button>
        {/each}
      </div>
    {:else if poll.status === 'closed'}
      <p>投票受付は終了しました。</p>
    {:else}
      <p>現在、投票を受け付けていません。</p>
    {/if}
    {#if error && screen === 'vote'}<p class="error" role="alert">{error}</p>{/if}
  {/if}
</main>

<dialog
  bind:this={confirmation}
  class="confirmation"
  aria-labelledby="confirmation-title"
  on:cancel|preventDefault
>
  <h2 id="confirmation-title" aria-live="polite">
    {screen === 'cancelled' ? '投票を取り消しました' : '投票ありがとうございます'}
  </h2>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <div class="stack">
    <button class="primary" type="button" on:click={returnToVote} disabled={submitting}>戻る</button>
    {#if screen === 'thanks'}
      <button class="cancel-vote" type="button" on:click={cancelVote} disabled={submitting}>
        今の投票を取り消す
      </button>
    {/if}
  </div>
</dialog>

<style>
  .voter-page button,
  .confirmation button {
    border-radius: 12px;
  }

  .ballot-view {
    width: min(100% - 4rem, 1000px);
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 1.5rem 0;
  }

  .ballot-header {
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .ballot-header h1 {
    margin: 0;
  }

  .ballot-header p {
    margin: 0.5rem 0 0;
  }

  .choices {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
  }

  .choices .choice {
    flex: 0 0 calc((100% - 2rem) / 3);
    min-width: 0;
    min-height: 108px;
    padding: 1.25rem;
    border-radius: 16px;
    font-size: 18px;
    line-height: 1.5;
    overflow-wrap: anywhere;
    text-wrap: balance;
    touch-action: manipulation;
  }

  .confirmation {
    width: min(100% - 2.5rem, 440px);
    max-height: calc(100svh - 2.5rem);
    padding: 2rem;
    border: 0;
    border-radius: 20px;
    color: #1a1a1a;
    background: #fff;
    text-align: center;
    box-shadow: 0 16px 48px rgb(0 0 0 / 16%);
  }

  .confirmation::backdrop {
    background: rgb(0 0 0 / 35%);
  }

  .confirmation h2 {
    margin: 0 0 1.5rem;
    font-size: 1.4rem;
    line-height: 1.5;
    text-wrap: balance;
  }

  .confirmation .cancel-vote {
    border-color: transparent;
    color: #555;
    background: transparent;
    font-size: 0.875rem;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .confirmation .cancel-vote:hover:not(:disabled) {
    background: #f6f6f4;
  }

  @media (max-width: 767px) {
    .ballot-view {
      width: calc(100% - 2rem);
    }

    .choices .choice {
      flex-basis: calc((100% - 1rem) / 2);
    }
  }

  @media (max-width: 520px) {
    .choices .choice {
      flex-basis: 100%;
      min-height: 88px;
    }
  }
</style>
