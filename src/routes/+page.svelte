<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
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

  async function vote(optionId: string) {
    if (submitting) return;
    submitting = true;
    error = '';
    try {
      receipt = await apiRequest<VoteReceipt>('/api/votes', {
        method: 'POST',
        body: JSON.stringify({ optionId, requestId: crypto.randomUUID() })
      });
      screen = 'thanks';
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
    receipt = null;
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

<main class="page">
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
          pattern="[0-9]{4}"
          maxlength="4"
          autocomplete="off"
          bind:value={pin}
          required
        />
      </div>
      <button class="primary" type="submit" disabled={submitting || pin.length !== 4}>開く</button>
    </form>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  {:else if screen === 'thanks'}
    <h1>投票ありがとうございます</h1>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <div class="stack">
      <button class="primary" type="button" on:click={returnToVote}>戻る</button>
      <button type="button" on:click={cancelVote} disabled={submitting}>今の投票を取り消す</button>
    </div>
  {:else if screen === 'cancelled'}
    <h1>投票を取り消しました</h1>
    <button class="primary" type="button" on:click={returnToVote}>戻る</button>
  {:else if poll}
    <h1>{poll.title}</h1>
    {#if poll.closesAt}
      <p class="muted">受付期限: {formatDate(poll.closesAt)}</p>
    {/if}
    {#if poll.status === 'open' && poll.options.length > 0}
      <div class="stack" aria-label="投票先">
        {#each poll.options as option (option.id)}
          <button class="primary" type="button" on:click={() => vote(option.id)} disabled={submitting}>
            {option.label}
          </button>
        {/each}
      </div>
    {:else if poll.status === 'closed'}
      <p>投票受付は終了しました。</p>
    {:else}
      <p>現在、投票を受け付けていません。</p>
    {/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  {/if}
</main>
