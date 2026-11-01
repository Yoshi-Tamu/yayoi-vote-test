<script lang="ts">
  import { onMount } from 'svelte';
  import type { ResultsView } from '../../../shared/types';
  import { apiRequest } from '$lib/api';

  let results: ResultsView | null = null;
  let loading = true;
  let error = '';

  async function loadResults() {
    if (loading && results) return;
    loading = true;
    error = '';
    try {
      results = await apiRequest<ResultsView>('/api/results', { cache: 'no-store' });
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '結果を取得できませんでした';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void loadResults();
  });
</script>

<svelte:head>
  <title>投票結果</title>
</svelte:head>

<main class="page results-page">
  <header>
    <div>
      <h1>投票結果</h1>
      {#if results}<p class="muted">{results.title}</p>{/if}
    </div>
    <button type="button" on:click={loadResults} disabled={loading}>更新</button>
  </header>

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  {#if loading && !results}
    <p role="status">読み込み中</p>
  {:else if results}
    {#if results.entries.length > 0}
      <ol class="ranking" aria-label="上位3位までの結果" aria-busy={loading}>
        {#each results.entries as entry (entry.id)}
          <li>
            <div class="rank">
              <span>{entry.rank}位</span>
              {#if entry.tied}<span class="tie">タイ</span>{/if}
            </div>
            <h2>{entry.label}</h2>
            <div class="votes"><span>{entry.votes.toLocaleString('ja-JP')}</span>票</div>
          </li>
        {/each}
      </ol>
    {:else}
      <p>表示できる得票結果はありません。</p>
    {/if}
  {/if}
</main>

<style>
  .results-page {
    width: min(100% - 4rem, 960px);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  header h1,
  header p {
    margin: 0;
  }

  header p {
    margin-top: 0.5rem;
  }

  header button {
    border-radius: 12px;
  }

  .ranking {
    display: grid;
    gap: 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr) auto;
    align-items: center;
    gap: 1.5rem;
    min-height: 120px;
    padding: 1.5rem;
    border: 1px solid #d6d6d2;
    border-radius: 16px;
    background: #fff;
  }

  .rank {
    display: grid;
    gap: 0.25rem;
    color: #174f86;
    font-size: 2rem;
    font-weight: 700;
    text-align: center;
  }

  .tie {
    font-size: 1rem;
    font-weight: 500;
  }

  h2 {
    margin: 0;
    font-size: clamp(1.2rem, 2.5vw, 1.65rem);
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .votes {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    font-size: 1rem;
    white-space: nowrap;
  }

  .votes span {
    font-size: 2rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 600px) {
    .results-page {
      width: calc(100% - 2rem);
    }

    li {
      grid-template-columns: 56px minmax(0, 1fr);
      gap: 0.75rem 1rem;
      padding: 1rem;
    }

    .rank {
      grid-row: span 2;
      font-size: 1.5rem;
    }

    .votes {
      grid-column: 2;
    }

    .votes span {
      font-size: 1.5rem;
    }
  }
</style>
