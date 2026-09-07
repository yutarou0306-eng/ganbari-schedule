import React from "react";

const oceanBg = "linear-gradient(180deg, #0B3D62 0%, #14588C 42%, #2E9BC7 78%, #6FCFEB 100%)";

function Section({ id, emoji, title, children }) {
  return (
    <div id={id} style={{ background: "#fff", borderRadius: 18, padding: "18px 20px", marginBottom: 14, boxShadow: "0 10px 22px rgba(11,61,98,0.2)", scrollMarginTop: 16 }}>
      <div style={{ fontWeight: 900, color: "#0B3D62", fontSize: 17, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        {title}
      </div>
      <div style={{ color: "#3d5a6c", fontSize: 14.5, lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

function Step({ n, children }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
      <div
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#14588C",
          color: "#fff",
          fontSize: 12.5,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        {n}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div style={{ minHeight: "100vh", background: oceanBg, padding: "28px 16px 60px", fontFamily: "'Kaisei Decol', 'Hiragino Maru Gothic ProN', sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <a
          href={window.location.pathname}
          style={{
            display: "inline-block",
            marginBottom: 14,
            padding: "8px 16px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          🏠 トップへ
        </a>

        <h1
          style={{
            fontFamily: "'Kaisei Decol', serif",
            color: "#fff",
            textAlign: "center",
            fontSize: 26,
            textShadow: "0 2px 10px rgba(11,61,98,0.5)",
            margin: "0 0 4px",
          }}
        >
          🐚 がんばりスケジュール
        </h1>
        <p style={{ textAlign: "center", color: "#EAF7FB", fontSize: 14.5, marginBottom: 24 }}>
          使い方ガイド
        </p>

        <div style={{ background: "#fff", borderRadius: 18, padding: "16px 20px", marginBottom: 14, boxShadow: "0 10px 22px rgba(11,61,98,0.2)" }}>
          <div style={{ fontWeight: 900, color: "#0B3D62", fontSize: 15.5, marginBottom: 10 }}>📋 もくじ</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { href: "#guide-intro", emoji: "📖", label: "どんなアプリ？" },
              { href: "#guide-step1", emoji: "🎀", label: "1. スタンプ帳を作る" },
              { href: "#guide-step2", emoji: "🌟", label: "2. スケジュールを作る" },
              { href: "#guide-step3", emoji: "🎁", label: "3. ご褒美を決める" },
              { href: "#guide-step4", emoji: "✅", label: "4. 毎日スタンプを押す" },
              { href: "#guide-step5", emoji: "🥚", label: "5. 卵が育つ・進化する" },
              { href: "#guide-step6", emoji: "📝", label: "6. メモ・コメント" },
              { href: "#guide-step7", emoji: "⚗️", label: "7. ファミリア配合（Master同士を組み合わせる）" },
              { href: "#guide-step8", emoji: "⭐", label: "8. ステータスに★を割り振る" },
              { href: "#guide-parent", emoji: "🔒", label: "保護者だけができること" },
              { href: "#guide-homescreen", emoji: "📱", label: "ホーム画面にアプリのように追加する" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{ color: "#14588C", fontSize: 14, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}
              >
                <span style={{ fontSize: 16 }}>{item.emoji}</span>
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <Section id="guide-intro" emoji="📖" title="どんなアプリ？">
          子どもの毎日の練習・お手伝いなどを、スタンプを貯めて記録する習慣化アプリです。ログイン不要で、共有リンクを開くだけで使えます。全部達成するとスケジュールごとに配布されるドラゴンやペガサスといったファミリアカード（キャラクターカード）を入手することができます。
        </Section>

        <Section id="guide-step1" emoji="🎀" title="1. スタンプ帳を作る">
          <Step n={1}>トップページの「スタンプ帳をつくる」から、お子さんの名前・生年月日・保護者用暗証番号（4〜6桁）を登録します。</Step>
          <Step n={2}>この保護者用暗証番号は、あとで新しいスケジュールを作るときにも必要になります（お子さんが自分でどんどん作れてしまわないようにするためのものです）。</Step>
          <Step n={3}>作ったスタンプ帳には複数のスケジュールを紐づけることができ、貯めたスタンプの合計や、達成してもらった育成キャラのカード（🎴集めたカード）が1か所にまとまります。</Step>
          <Step n={4}>「📅つながっているスケジュール」には今がんばっている（まだ完了していない）ものだけが並び、完了したスケジュールは少し下の「✅完了したスケジュール」の方でまとめて確認できます。</Step>
        </Section>

        <Section id="guide-step2" emoji="🌟" title="2. スケジュールを作る">
          <Step n={1}>スタンプ帳のページにある「新しいスケジュールを作る（女の子用／男の子用）」から作成します。スケジュールは必ずスタンプ帳の中から作る仕様になっています。</Step>
          <Step n={2}>作成の前に、そのスタンプ帳を作ったときに設定した保護者用暗証番号の入力が求められます。</Step>
          <Step n={3}>タイトル、期間（開始日を選ぶと自動で1か月後の前日までが入ります）、やること（教科・習い事など）を設定します。</Step>
          <Step n={4}>作ったスケジュールは「共有（AirDropなど）」「LINEでシェア」「リンクをコピー」からお子さんの端末に送れます。</Step>
        </Section>

        <Section id="guide-step3" emoji="🎁" title="3. ご褒美を決める">
          スケジュール作成時に、全部達成（100%）したときのご褒美（お楽しみ）を設定できます。
          <br />
          <br />
          このご褒美は、何が良いかを親子で話し合って決めることをおすすめします。お子さん自身が「これが欲しい・やりたい」と思えるものを一緒に選ぶことで、最後まで続けるモチベーションになります。あとから内容を修正することもできます。
          <br />
          <br />
          これとは別に、スタンプ帳には「貯めたスタンプ」を使って景品と交換できる機能があります。こちらも、何と交換できるようにするかをお子さんと話し合って決めたうえで、保護者が景品リストとして登録する形にしてください。
        </Section>

        <Section id="guide-step4" emoji="✅" title="4. 毎日スタンプを押す">
          今日のマスは「本スタンプ」です。押すとその日の記録として残ります。今日以外の日は自由に「仮スタンプ（練習用）」で遊べます。
          <br />
          <br />
          もし前の日に押し忘れがあった場合、保護者が🔒マークからロックを解除すると、過去の日にも本スタンプを押せるようになります。1回押すと記録、もう1回押すと押し忘れていた別の日を1日分「取り戻す」演出が出ます。
        </Section>

        <Section id="guide-step5" emoji="🥚" title="5. 卵が育つ・進化する">
          スケジュールを作ると、ランダムな色の卵が割り当てられます（男の子用はドラゴン・バトルタイガー・フェニックス・フェンリル・グリフォン、女の子用はペガサス（ユニコーン）・フェアリー・マジカルキャット・スワンプリンセス・マーメイドの、あわせて全10種類）。達成率が上がるごとに卵→赤ちゃん→…→マスターへと成長します。
          <br />
          <br />
          卵がかえると名前をつけられます（デフォルトは「レッドドラゴン」のような色+種族名）。それより後の成長では「〇〇の様子が…」という確認が出て、「声をかける」を押すと進化の演出が見られます（お子さんが見るまで「放っておく」ことも可能です）。
          <br />
          <br />
          スケジュールが30日以上・スタンプ50個以上のときに100%達成すると、育ったキャラのカードがもらえます。
        </Section>

        <Section id="guide-step6" emoji="📝" title="6. メモ・コメント">
          各日付の「📝メモ」から、お子さんが「やったこと・感想」を書けます。
          <br />
          <br />
          保護者や祖父母、塾の先生などは「📋記録を見る」から記録を一覧で見て、それぞれの日の記録に「💬返信する」でコメント（名前＋コメント）を残せます。暗証番号は不要なので、リンクを知っている人なら誰でもコメントできます。
          <br />
          <br />
          書いたコメントは、それぞれに付いている「編集」「削除」から直せます（削除は誤って消さないよう、一度確認が入ります）。
        </Section>

        <Section id="guide-step7" emoji="⚗️" title="7. ファミリア配合（Master同士を組み合わせる）">
          Masterまで育ったカードが2枚以上あると、「⚗️配合する」からファミリア配合のページを開けます。
          <br />
          <br />
          一覧から「ベース」1枚・「サブ」1枚を選ぶと、ベースのLVとステータスにサブの分がすべて合算されます。サブに選んだ方のカードは配合で消費されてなくなります（何度でも配合可能で、配合するたびに前のスケジュール情報や成長の記録も残っていきます）。
          <br />
          <br />
          男の子用の5種族（ドラゴン・バトルタイガー・フェニックス・フェンリル・グリフォン）どうしの組み合わせによっては、より強い「グランドマスター」という新しい姿・名前に変化することがあります（変化しない組み合わせは、ベースの見た目のまま強くなります）。カードをタップすると、配合の記録（誰と誰を組み合わせたか）や、これまでの成長の様子もまとめて見られます。
        </Section>

        <Section id="guide-step8" emoji="⭐" title="8. ステータスに★を割り振る">
          Master（グランドマスターを含む）まで育ったカードは、これまでに貯めた★をHP・MP・力・守備・早さ・賢さに割り振って、さらに強くできます。
          <br />
          <br />
          カードの詳細画面にある「⭐ステータスに割り振る」から、＋／－ボタンや数字入力でステータスごとに増やす数を決め、「決定」→最終確認で反映されます。ここで使う★は、景品交換で使う★とは別に数えられるので、どちらを使ってももう片方が減ることはありません。
        </Section>

        <Section id="guide-parent" emoji="🔒" title="保護者だけができること">
          スケジュール画面右上の🔒（または鍵アイコン）から暗証番号を入れて解除すると、以下ができます。
          <br />
          <br />
          ・今日以外の日にも本スタンプを押す／取り戻す
          <br />
          ・スケジュールの内容を修正する
          <br />
          <br />
          また、スタンプ帳から「新しいスケジュールを作る」ときも、そのスタンプ帳を作った時に設定した保護者用暗証番号の入力が必要です（お子さんが自分でどんどん新しいスケジュールを作れてしまわないようにするためです）。スケジュール側の暗証番号（本スタンプ用）とは別のものなので、スケジュールの修正画面で暗証番号を変えても、この方には影響しません。
          <br />
          <br />
          ※「見る」一覧の🗑ボタンは、その端末の表示から外すだけです。スケジュール自体を完全に削除したい場合は、スケジュールを開いてその中の「🗑削除する」から行ってください（どのスタンプ帳にも紐づいていないスケジュールは、この一覧の🗑から直接完全に削除されます）。
        </Section>

        <Section id="guide-homescreen" emoji="📱" title="ホーム画面にアプリのように追加する">
          ブラウザのブックマークではなく、アイコンをホーム画面に置いてアプリのように開けます。
          <br />
          <br />
          <div style={{ fontWeight: 800, color: "#0B3D62", marginTop: 10, marginBottom: 4 }}>iPhone（Safari）の場合</div>
          <Step n={1}>Safariでこのページ（またはスケジュール／スタンプ帳のリンク）を開きます。</Step>
          <Step n={2}>下部の共有アイコン（□から上に矢印）をタップします。</Step>
          <Step n={3}>「ホーム画面に追加」を選び、「追加」をタップします。</Step>
          <div style={{ fontWeight: 800, color: "#0B3D62", marginTop: 14, marginBottom: 4 }}>Android（Chrome）の場合</div>
          <Step n={1}>Chromeでこのページ（またはリンク）を開きます。</Step>
          <Step n={2}>右上の「⋮」メニューをタップします。</Step>
          <Step n={3}>「ホーム画面に追加」（または「アプリをインストール」）を選びます。</Step>
          <br />
          お子さんの端末には、そのお子さん用のスケジュールやスタンプ帳のリンクをホーム画面に追加しておくと、毎回リンクを探さずワンタップで開けて便利です。
        </Section>

        <a
          href={window.location.pathname}
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 8,
            padding: "14px 0",
            borderRadius: 16,
            background: "linear-gradient(135deg,#F4E2B8,#E5C878)",
            color: "#5C3A21",
            textDecoration: "none",
            fontWeight: 900,
            fontSize: 15.5,
            boxShadow: "0 10px 20px rgba(0,0,0,0.25)",
          }}
        >
          🏠 トップページへ戻る
        </a>
      </div>
    </div>
  );
}
