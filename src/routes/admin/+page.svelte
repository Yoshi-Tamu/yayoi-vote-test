<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    AdminOverview,
    PollOption,
    PollView,
    ResultVote,
    VotePage
  } from '../../../shared/types';
  import { ApiError, apiRequest } from '$lib/api';

  type Screen = 'loading' | 'login' | 'admin';

  let screen: Screen = 'loading';
  let pin = '';
  let poll: PollView | null = null;
  let title = '';
  let closesAt = '';
  let acceptingVotes = false;
  let newOption = '';
  let overview: AdminOverview | null = null;
  let votes: ResultVote[] = [];
  let nextCursor: string | null = null;
  let votesLoaded = false;
  let busy = false;
  let error = '';
  let message = '';

  function toLocalInput(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }

  function applyPoll(value: PollView) {
    poll = value;
    title = value.title;
    closesAt = toLocalInput(value.closesAt);
    acceptingVotes = value.acceptingVotes && value.status !== 'closed';
  }

  function applyOverview(value: AdminOverview) {
    overview = value;
    applyPoll(value.poll);
  }

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(new Date(value));
  }

  function setError(cause: unknown, fallback: string) {
    error = cause instanceof Error ? cause.message : fallback;
    message = '';
  }

  async function loadOverview() {
    if (busy) return;
    busy = true;
    error = '';
    try {
      applyOverview(await apiRequest<AdminOverview>('/api/admin/overview'));
      screen = 'admin';
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        screen = 'login';
      } else {
        setError(cause, '読み込みに失敗しました');
        screen = 'login';
      }
    } finally {
      busy = false;
    }
  }

  async function login() {
    if (pin.length !== 4 || busy) return;
    busy = true;
    error = '';
    try {
      const data = await apiRequest<{ role: 'admin'; overview: AdminOverview }>('/api/auth/admin', {
        method: 'POST',
        body: JSON.stringify({ pin })
      });
      pin = '';
      applyOverview(data.overview);
      screen = 'admin';
    } catch (cause) {
      setError(cause, '認証に失敗しました');
    } finally {
      busy = false;
    }
  }

  async function savePoll() {
    if (busy) return;
    busy = true;
    error = '';
    message = '';
    try {
      const updated = await apiRequest<AdminOverview>('/api/admin/poll', {
        method: 'PUT',
        body: JSON.stringify({
          title,
          closesAt: closesAt ? new Date(closesAt).toISOString() : null,
          acceptingVotes
        })
      });
      applyOverview(updated);
      message = '保存しました';
    } catch (cause) {
      setError(cause, '保存に失敗しました');
    } finally {
      busy = false;
    }
  }

  async function addOption() {
    const label = newOption.trim();
    if (!label || busy) return;
    busy = true;
    error = '';
    try {
      applyOverview(
        await apiRequest<AdminOverview>('/api/admin/options', {
          method: 'POST',
          body: JSON.stringify({ label })
        })
      );
      newOption = '';
    } catch (cause) {
      setError(cause, '追加に失敗しました');
    } finally {
      busy = false;
    }
  }

  async function saveOption(option: PollOption) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      applyOverview(
        await apiRequest<AdminOverview>(`/api/admin/options/${option.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ label: option.label, sortOrder: option.sortOrder })
        })
      );
      message = '保存しました';
    } catch (cause) {
      setError(cause, '保存に失敗しました');
    } finally {
      busy = false;
    }
  }

  async function deleteOption(option: PollOption) {
    if (!confirm(`「${option.label}」と関連する票を削除しますか？`) || busy) return;
    busy = true;
    error = '';
    try {
      applyOverview(
        await apiRequest<AdminOverview>(`/api/admin/options/${option.id}`, {
          method: 'DELETE',
          body: JSON.stringify({ deleteVotes: true })
        })
      );
      votes = votes.filter((vote) => vote.optionId !== option.id);
    } catch (cause) {
      setError(cause, '削除に失敗しました');
    } finally {
      busy = false;
    }
  }

  async function loadVotes(firstPage: boolean) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      const cursor = firstPage ? null : nextCursor;
      const query = cursor ? `?limit=50&cursor=${encodeURIComponent(cursor)}` : '?limit=50';
      const page = await apiRequest<VotePage>(`/api/admin/votes${query}`);
      votes = firstPage ? page.votes : [...votes, ...page.votes];
      nextCursor = page.nextCursor;
      votesLoaded = true;
    } catch (cause) {
      setError(cause, '個票の取得に失敗しました');
    } finally {
      busy = false;
    }
  }

  async function deleteVote(id: string) {
    if (!confirm('この票を削除しますか？') || busy) return;
    busy = true;
    error = '';
    try {
      const data = await apiRequest<{ voteId: string; overview: AdminOverview }>(
        `/api/admin/votes/${id}`,
        { method: 'DELETE' }
      );
      votes = votes.filter((vote) => vote.id !== data.voteId);
      applyOverview(data.overview);
    } catch (cause) {
      setError(cause, '票の削除に失敗しました');
    } finally {
      busy = false;
    }
  }

  async function reset(target: 'votes' | 'poll') {
    const prompt = target === 'votes' ? 'すべての票を削除しますか？' : '投票先と票をすべて削除しますか？';
    if (!confirm(prompt) || busy) return;
    busy = true;
    error = '';
    try {
      const data = await apiRequest<{
        target: 'votes' | 'poll';
        overview: AdminOverview;
      }>('/api/admin/reset', {
        method: 'POST',
        body: JSON.stringify({ target })
      });
      applyOverview(data.overview);
      votes = [];
      nextCursor = null;
      votesLoaded = false;
      message = 'リセットしました';
    } catch (cause) {
      setError(cause, 'リセットに失敗しました');
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    void loadOverview();
  });
</script>

<main class="page">
  {#if screen === 'loading'}
    <p>読み込み中</p>
  {:else if screen === 'login'}
    <h1>管理</h1>
    <form on:submit|preventDefault={login} class="stack">
      <div class="field">
        <label for="admin-pin">PIN</label>
        <input
          id="admin-pin"
          type="password"
          inputmode="numeric"
          pattern="[0-9]{4}"
          maxlength="4"
          autocomplete="off"
          bind:value={pin}
          required
        />
      </div>
      <button class="primary" type="submit" disabled={busy || pin.length !== 4}>開く</button>
    </form>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  {:else if poll}
    <h1>管理</h1>
    {#if message}<p class="message" role="status">{message}</p>{/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}

    <section>
      <h2>投票設定</h2>
      <form on:submit|preventDefault={savePoll}>
        <div class="field">
          <label for="title">名称</label>
          <input id="title" type="text" maxlength="80" bind:value={title} required />
        </div>
        <div class="field">
          <label for="closes-at">受付期限</label>
          <input id="closes-at" type="datetime-local" bind:value={closesAt} required />
        </div>
        <div class="field row">
          <input id="accepting" type="checkbox" bind:checked={acceptingVotes} />
          <label for="accepting">受付中</label>
        </div>
        <button class="primary" type="submit" disabled={busy}>保存</button>
      </form>
    </section>

    <section class="section">
      <h2>投票先</h2>
      <form on:submit|preventDefault={addOption} class="row">
        <input aria-label="新しい投票先" type="text" maxlength="40" bind:value={newOption} required />
        <button type="submit" disabled={busy || !newOption.trim()}>追加</button>
      </form>
      {#if poll.options.length > 0}
        <div class="stack option-list">
          {#each poll.options as option (option.id)}
            <div class="option-row">
              <input aria-label="投票先名" type="text" maxlength="40" bind:value={option.label} />
              <button type="button" on:click={() => saveOption(option)} disabled={busy}>保存</button>
              <button class="danger" type="button" on:click={() => deleteOption(option)} disabled={busy}>削除</button>
            </div>
          {/each}
        </div>
      {:else}
        <p class="muted">投票先はありません。</p>
      {/if}
    </section>

    <section class="section">
      <h2>結果</h2>
      <button type="button" on:click={loadOverview} disabled={busy}>投票を確認</button>
      {#if overview}
        <table>
          <thead><tr><th>投票先</th><th>票数</th></tr></thead>
          <tbody>
            {#each overview.options as option (option.id)}
              <tr><td>{option.label}</td><td>{option.votes}</td></tr>
            {/each}
          </tbody>
          <tfoot><tr><th>合計</th><th>{overview.totalVotes}</th></tr></tfoot>
        </table>

        <h2 class="subheading">個票</h2>
        {#if !votesLoaded}
          <button type="button" on:click={() => loadVotes(true)} disabled={busy}>個票を表示</button>
        {:else if votes.length > 0}
          <div class="vote-list">
            {#each votes as vote (vote.id)}
              <div class="vote-row">
                <span>{vote.optionLabel}</span>
                <time datetime={vote.castAt}>{formatDate(vote.castAt)}</time>
                <button class="danger" type="button" on:click={() => deleteVote(vote.id)} disabled={busy}>削除</button>
              </div>
            {/each}
          </div>
          {#if nextCursor}
            <button class="more-button" type="button" on:click={() => loadVotes(false)} disabled={busy}>
              続きを表示
            </button>
          {/if}
        {:else}
          <p class="muted">票はありません。</p>
        {/if}

        <h2 class="subheading">JSON</h2>
        <pre>{JSON.stringify(overview, null, 2)}</pre>
      {/if}
    </section>

    <section class="section">
      <h2>リセット</h2>
      <div class="row">
        <button class="danger" type="button" on:click={() => reset('votes')} disabled={busy}>票をリセット</button>
        <button class="danger" type="button" on:click={() => reset('poll')} disabled={busy}>投票全体をリセット</button>
      </div>
    </section>
  {/if}
</main>

<style>
  section:not(.section) {
    margin-top: 0;
  }

  form.row input {
    flex: 1 1 16rem;
  }

  .option-list {
    margin-top: 1rem;
  }

  .option-row,
  .vote-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 0.5rem;
    align-items: center;
  }

  .vote-row {
    border-bottom: 1px solid #ccc;
    padding: 0.6rem 0;
  }

  .subheading {
    margin-top: 1.5rem;
    font-size: 1rem;
  }

  .more-button {
    margin-top: 1rem;
  }

  #accepting {
    width: 1.2rem;
    height: 1.2rem;
  }

  #accepting + label {
    margin: 0;
  }

  @media (max-width: 600px) {
    .option-row,
    .vote-row {
      grid-template-columns: 1fr 1fr;
    }

    .option-row input,
    .vote-row span {
      grid-column: 1 / -1;
    }
  }
</style>
