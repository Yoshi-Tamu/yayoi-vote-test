<script lang="ts">
  import { resolve } from '$app/paths';
  import CommandBlock from '$lib/CommandBlock.svelte';
  import { prepareCommand, runtimeCommand, modelCommand, directStartCommand, saveLaunchersCommand, startCommand, startMtpCommand } from '$lib/lllmSetup';
</script>

<svelte:head>
  <title>RTX 2080 Ti セットアップ手順 | llama.cpp + Qwen3.8</title>
  <meta name="description" content="WindowsのRTX 2080 Tiでllama.cppとQwen3.8-27Bを使う手順。ダウンロード、起動、MTP高速化、困ったときの対処をまとめています。" />
</svelte:head>

<main class="page setup-page">
  <header>
    <a class="back-link" href={resolve('/')}>← 投票ページ</a>
    <p class="eyebrow">Windows / llama.cpp / Qwen3.8-27B</p>
    <h1>RTX 2080 Ti<br />セットアップ手順</h1>
    <p class="intro">専用フォルダ <code>C:\LocalLLM\Qwen3.8</code> に導入し、PCのブラウザーからチャットできる状態にします。</p>
    <p class="muted">手順更新：2026年11月6日 · 再現性のため llama.cpp b11960 / CUDA 12.4 に固定</p>
  </header>

  <aside class="requirements" aria-label="用意する環境">
    <h2>用意する環境</h2>
    <dl>
      <div><dt>OS</dt><dd>Windows 11 64bitを想定</dd></div>
      <div><dt>GPU</dt><dd>RTX 2080 Ti（通常版：VRAM 11GB）</dd></div>
      <div><dt>メモリ</dt><dd>RAM 32GB以上を推奨</dd></div>
      <div><dt>空き容量</dt><dd>Cドライブに30GB以上を目安に確保</dd></div>
      <div><dt>モデル</dt><dd>Qwen3.8-27B / UD-Q4_K_M（約16.5GB）</dd></div>
    </dl>
    <p>モデル全体は11GBのVRAMに収まらないため、GPUとCPU・RAMを併用します。2080 Tiでの速度は未計測です。CPU、メモリ帯域、会話の長さでも変わります。</p>
  </aside>

  <nav class="contents" aria-label="手順の目次">
    <h2>手順</h2>
    <ol>
      <li><a href="#prepare">ドライバーと保存先を準備</a></li>
      <li><a href="#runtime">llama.cppを取得</a></li>
      <li><a href="#model">モデルを取得</a></li>
      <li><a href="#launch">1行で起動する</a></li>
      <li><a href="#chat">ブラウザーで使う</a></li>
      <li><a href="#speed">MTPと速度の調整</a></li>
    </ol>
    <a href="#troubleshooting">困ったとき</a>
  </nav>

  <section id="prepare" class="section">
    <h2><span class="step">01</span> ドライバーと保存先を準備</h2>
    <p><a href="https://www.nvidia.com/Download/index.aspx?lang=jp" target="_blank" rel="noreferrer">NVIDIA公式ドライバー</a>で、RTX 2080 TiとWindowsに対応するドライバーを更新します。再起動を求められたら再起動してください。</p>
    <p>スタートメニューから<strong>Windows PowerShell</strong>を開きます。以下のコマンドを<strong>同じPowerShellのウィンドウで、上から順に</strong>実行してください。管理者としての起動は通常不要です。</p>
    <CommandBlock label="PowerShell：保存先を作成・GPUを確認" command={prepareCommand} />
    <p><code>nvidia-smi</code> に「RTX 2080 Ti」が出れば次へ進みます。保存先はOneDriveの外です。Cドライブへの作成が拒否される場合だけ、管理者としてPowerShellを開き直して最初から実行してください。</p>
  </section>

  <section id="runtime" class="section">
    <h2><span class="step">02</span> llama.cppを取得</h2>
    <p>Windows用CUDA 12.4の本体と実行用DLLを取得し、SHA256を照合してから、両方を同じ <code>bin</code> フォルダに展開します。Python・Git・CUDA Toolkitの別途インストールは、この手順では不要です。</p>
    <CommandBlock label="PowerShell：本体とCUDA DLLを取得" command={runtimeCommand} />
    <p>最後にバージョン情報が表示されれば取得完了です。ダウンロードが途中で止まった場合は、同じコマンドを再実行すると途中から再開します。</p>
    <details>
      <summary>ブラウザーで直接ダウンロードする場合</summary>
      <ul>
        <li><a href="https://github.com/ggml-org/llama.cpp/releases/download/b11960/llama-b11960-bin-win-cuda-12.4-x64.zip">本体：llama-b11960-bin-win-cuda-12.4-x64.zip</a>（約280MB）</li>
        <li><a href="https://github.com/ggml-org/llama.cpp/releases/download/b11960/cudart-llama-bin-win-cuda-12.4-x64.zip">DLL：cudart-llama-bin-win-cuda-12.4-x64.zip</a>（約391MB）</li>
      </ul>
      <p>両方のZIPの中身を <code>C:\LocalLLM\Qwen3.8\bin</code> に展開し、直下に <code>llama-server.exe</code> とDLLを置きます。フォルダが二重にならないようにしてください。</p>
    </details>
  </section>

  <section id="model" class="section">
    <h2><span class="step">03</span> モデルを取得</h2>
    <p><code>Qwen3.8-27B-UD-Q4_K_M.gguf</code> を取得します。約16.5GBあるため、回線によって時間がかかります。取得後のSHA256確認中も、そのまま待ってください。</p>
    <CommandBlock label="PowerShell：モデルを取得・検証" command={modelCommand} />
    <p class="muted">このコマンドは手順01の <code>$root</code> と手順02の <code>Get-VerifiedFile</code> を使います。PowerShellを閉じた場合は手順01・02を再実行してください。</p>
    <p><a href="https://huggingface.co/unsloth/Qwen3.8-27B-GGUF/resolve/4ca720788d1e01f1bff70c033e0d0028fd02e502/Qwen3.8-27B-UD-Q4_K_M.gguf?download=true">ブラウザーでモデルをダウンロード</a>する場合は、<code>C:\LocalLLM\Qwen3.8\models</code> に、ファイル名を変えずに保存します。</p>
  </section>

  <section id="launch" class="section">
    <h2><span class="step">04</span> 1行で起動する</h2>
    <p><strong>手動で本体・DLL・モデルの配置まで終わっている場合は、ここから進められます。</strong> 2080 TiのPCでWindows PowerShellを新しく開き、下の「コピー」を押して、1行全体を貼り付けてEnterを押してください。</p>
    <p>この1行で直接サーバーを起動します。ログが流れてモデルの読み込みが始まったら、このPowerShellを開いたまま手順05へ進んでください。</p>
    <CommandBlock label="PowerShell：1行で直接起動" command={directStartCommand} />
    <p>貼り付け前から <code>&gt;&gt;</code> と表示されている場合は、まず <kbd>Ctrl</kbd> + <kbd>C</kbd> で途中の入力を取り消すか、PowerShellを開き直してください。</p>
    <details>
      <summary>起動ファイルを保存して使う場合（任意）</summary>
      <p>以下を別のPowerShellに貼り付けると、通常版の <code>Start-Qwen.cmd</code> とMTP版の <code>Start-Qwen-MTP.cmd</code> を保存します。1行コマンドですでに起動している場合は、サーバーを終了してから起動ファイルを使ってください。</p>
      <CommandBlock label="PowerShell：起動ファイルを保存" command={saveLaunchersCommand} />
      <p>開いたフォルダで <strong>Start-Qwen.cmdをダブルクリック</strong>します。起動中は黒いウィンドウを開いたままにします。</p>
      <p>「ファイルが見つかりません」と出た場合は、表示されたパスを確認してください。ZIPの中身は <code>bin</code> の直下に展開し、GGUFは <code>models</code> に指定の名前で保存します。</p>
    </details>
    <details>
      <summary>通常版の起動設定を見る</summary>
      <p>以下は作成されるCMDファイルの内容です。メモ帳で手動保存する場合に使います。</p>
      <CommandBlock label="Start-Qwen.cmdの内容" command={startCommand} />
    </details>
    <p>GPUへの割り当ては起動時に自動調整し、VRAMに約1GBの余裕を確保する設定です。CPUスレッド数は自動設定から始めます。</p>
  </section>

  <section id="chat" class="section">
    <h2><span class="step">05</span> ブラウザーで使う</h2>
    <ol class="instructions">
      <li>ログにサーバー起動の表示が出たら、<strong>2080 TiのPC上で</strong>ブラウザーを開きます。</li>
      <li>アドレス欄に <code>http://127.0.0.1:8080</code> と入力します。</li>
      <li>新しいチャットを作り、「日本語で自己紹介して」と送って返答を確認します。</li>
    </ol>
    <p>終了するときは、サーバーを起動したウィンドウで <kbd>Ctrl</kbd> + <kbd>C</kbd> を押します。ブラウザーを閉じただけではモデルは終了しません。次回は手順04の1行コマンドを再実行します。起動ファイルを保存した場合は <code>Start-Qwen.cmd</code> からも起動できます。</p>
    <p>初期設定はThinkingをオフにしています。長く考えさせる設定は出力トークンが増えるため、完了までの時間も長くなります。チャットを分ける場合はWeb UIの新しいチャットを使います。</p>
    <div class="note"><strong>このページはセットアップの説明です。</strong> 上の <code>127.0.0.1</code> は、ブラウザーを開いた端末自身を指します。スマホから2080 Tiのモデルへ接続する設定は含みません。サーバーはPC内からのみ接続できる設定です。</div>
    <details>
      <summary>コード用ツールなどからAPIで接続する場合</summary>
      <dl class="api-settings">
        <div><dt>Base URL</dt><dd><code>http://127.0.0.1:8080/v1</code></dd></div>
        <div><dt>モデル名</dt><dd><code>qwen3.8-local</code></dd></div>
        <div><dt>APIキー</dt><dd>このローカル構成では不要。入力必須のクライアントでは仮の文字列を指定します。</dd></div>
      </dl>
      <p>接続するツールも同じPCで動かします。生成されたコードは、内容を確認してから実行してください。</p>
    </details>
  </section>

  <section id="speed" class="section">
    <h2><span class="step">06</span> MTPと速度の調整</h2>
    <p>通常版で返答できたら、手順04の「起動ファイルを保存して使う場合」で起動ファイルを作成します。一度サーバーを終了して <strong>Start-Qwen-MTP.cmd</strong> を開くと、同じモデル内のMTPヘッドを使う投機的デコードを試せます。追加モデルのダウンロードは不要です。</p>
    <p>MTPは複数トークンの候補を作り、検証しながら生成を進める仕組みです。MoEはモデル自体の構造なので、これとは別です。文章やPC構成によっては速くならないため、同じ質問・同じThinking設定で通常版と比較してください。</p>
    <details>
      <summary>MTP版の起動設定を見る</summary>
      <CommandBlock label="Start-Qwen-MTP.cmdの内容" command={startMtpCommand} />
    </details>
    <p>遅くなる、起動しない、出力に問題がある場合は、終了して <code>Start-Qwen.cmd</code> に戻せます。2つを同時に起動しないでください。</p>
    <ul class="tips">
      <li><strong>メモリを空ける：</strong>ゲームなどを終了してからサーバーを起動します。起動後にVRAMが空いても、GPUへの割り当ては自動で増えません。割り当てを変えるには再起動します。</li>
      <li><strong>長い会話を分ける：</strong>不要な履歴が増えたら新しいチャットへ。コンテキストは8192から始め、メモリ不足なら起動ファイルの <code>--ctx-size 8192</code> を <code>--ctx-size 4096</code> に変更します。</li>
      <li><strong>CPUスレッドを比較する：</strong>必要なら起動ファイルに <code>--threads 4</code>、<code>--threads 6</code>、<code>--threads 8</code> などを追加して比較します。物理コア数を目安にし、同じ条件で測定してください。</li>
    </ul>
  </section>

  <section id="troubleshooting" class="section">
    <h2>困ったとき</h2>
    <details>
      <summary>Join-Pathで「引数がnull」と出る</summary>
      <p>途中の入力を <kbd>Ctrl</kbd> + <kbd>C</kbd> で取り消し、手順04の「1行で直接起動」を丸ごとコピーして実行してください。保存先を直接指定しているため、前の手順の変数を使わずに起動できます。</p>
    </details>
    <details>
      <summary>nvidia-smiが見つからない / CUDAデバイスが出ない</summary>
      <p>NVIDIAドライバーを更新してPCを再起動します。CPU版やCUDA 13版ではなく、この手順のWindows x64 CUDA 12.4版を使っているかも確認してください。</p>
    </details>
    <details>
      <summary>DLLが見つからない</summary>
      <p>手順02のDLL用ZIPも取得し、本体と同じ <code>bin</code> の直下へ展開してください。ZIPを置くだけでは動きません。</p>
    </details>
    <details>
      <summary>メモリ不足 / 起動が落ちる / GPU使用量が少ない</summary>
      <p>他のアプリを終了し、まず通常版・コンテキスト4096で再起動します。GPU割り当てのログに <code>offloaded</code> とCUDAデバイスが出ているか確認してください。27B Q4はVRAMに全量が収まらないので、CPU処理が残ること自体は正常です。</p>
      <p>Flash Attention関連のエラーが出る場合は <code>--flash-attn auto</code> を <code>--flash-attn off</code> に変更して再起動します。</p>
    </details>
    <details>
      <summary>ブラウザーで開かない / 8080番ポートが使われている</summary>
      <p>モデルの読み込み完了を待ち、同じPCで <code>http://127.0.0.1:8080</code> を開きます。すでに別のサーバーが動いている場合はそれを終了するか、起動ファイルの <code>--port 8080</code> を <code>--port 8081</code> に変更し、ブラウザー側も8081へ変更してください。</p>
    </details>
    <details>
      <summary>既存の4060 TiのPCからコピーする場合</summary>
      <p>両方のPCでllama.cppを終了し、元PCの <code>C:\LocalLLM\Qwen3.8</code> を、2080 TiのPCの同じ場所へコピーできます。特に約16.5GBのGGUFは再取得を省けます。</p>
      <p>このページの手順01で保存先を準備し、コピーしたGGUFを <code>models</code> に置けば手順03のダウンロードを省略できます。本体は手順02で揃え、手順04でこのPC用の起動ファイルを作ると手順どおりの構成になります。</p>
    </details>
  </section>

  <footer class="section">
    <h2>配布元・設定の資料</h2>
    <ul>
      <li><a href="https://github.com/ggml-org/llama.cpp/releases/tag/b11960" target="_blank" rel="noreferrer">llama.cpp b11960 公式リリース</a></li>
      <li><a href="https://github.com/ggml-org/llama.cpp/blob/b11960/tools/server/README.md" target="_blank" rel="noreferrer">llama-serverの起動オプション</a></li>
      <li><a href="https://huggingface.co/unsloth/Qwen3.8-27B-GGUF/tree/4ca720788d1e01f1bff70c033e0d0028fd02e502" target="_blank" rel="noreferrer">Unsloth版GGUFの固定リビジョン</a></li>
    </ul>
    <p class="muted">対象はテキストチャットの導入です。RAG・LoRA・QLoRAの導入や、インターネットへのモデル公開は含みません。</p>
    <a href="#prepare">手順の先頭へ ↑</a>
  </footer>
</main>

<style>
  .setup-page { width: min(100% - 2rem, 860px); padding-top: 2rem; }
  header { margin-bottom: 2rem; }
  a { color: #174f86; text-underline-offset: 0.2em; overflow-wrap: anywhere; }
  a:focus-visible, summary:focus-visible { outline: 3px solid #8db7e8; outline-offset: 4px; }
  .back-link { display: inline-block; margin-bottom: 2.5rem; font-size: 0.9rem; }
  .eyebrow { color: #555; font-size: 0.9rem; }
  h1 { margin-bottom: 1rem; font-size: clamp(2rem, 6vw, 3rem); line-height: 1.35; }
  .intro { max-width: 44rem; font-size: 1.05rem; }
  h2 { display: flex; gap: 0.8rem; align-items: baseline; line-height: 1.5; }
  .step { color: #174f86; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
  p, li, dd { line-height: 1.8; overflow-wrap: anywhere; }
  code { font-family: ui-monospace, Consolas, monospace; font-size: 0.9em; }
  p code, li code, dd code { padding: 0.1em 0.25em; background: #eaeae5; border-radius: 3px; }
  kbd { padding: 0.1rem 0.35rem; border: 1px solid #aaa; border-radius: 3px; background: #fff; }
  .requirements { padding: 1.5rem; border: 1px solid #d6d6d2; border-radius: 8px; background: #fff; }
  .requirements p { margin-bottom: 0; font-size: 0.9rem; color: #555; }
  dl { margin: 0; }
  dl > div { display: grid; grid-template-columns: 7rem minmax(0, 1fr); gap: 0.5rem; margin: 0.5rem 0; }
  dt { font-weight: 600; line-height: 1.8; }
  dd { margin: 0; }
  .contents { margin-top: 2rem; }
  .contents ol { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 2rem; padding-left: 1.5rem; }
  .section { margin-top: 2.5rem; padding-top: 2rem; scroll-margin-top: 1.5rem; }
  .instructions, .tips { padding-left: 1.5rem; }
  li + li { margin-top: 0.6rem; }
  .contents li + li { margin-top: 0; }
  .note { padding: 1rem 1.25rem; border-left: 3px solid #174f86; background: #edf2f6; line-height: 1.8; }
  details { margin: 1rem 0; padding: 0.9rem 1rem; border: 1px solid #d6d6d2; border-radius: 6px; background: #fff; min-width: 0; }
  summary { cursor: pointer; line-height: 1.65; font-weight: 600; }
  details p:last-child { margin-bottom: 0.25rem; }
  .api-settings { margin-top: 1rem; }
  footer { font-size: 0.9rem; }
  @media (max-width: 600px) {
    .setup-page { width: calc(100% - 1.5rem); padding-top: 1.25rem; }
    .requirements { padding: 1rem; }
    dl > div { grid-template-columns: 5rem minmax(0, 1fr); }
    .contents ol { grid-template-columns: 1fr; }
    .back-link { margin-bottom: 1.5rem; }
    details { padding: 0.8rem; }
  }
</style>
