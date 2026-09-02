import React from "react";

const oceanBg = "linear-gradient(180deg, #0B3D62 0%, #14588C 42%, #2E9BC7 78%, #6FCFEB 100%)";

function Section({ emoji, title, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, padding: "18px 20px", marginBottom: 14, boxShadow: "0 10px 22px rgba(11,61,98,0.2)" }}>
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

        <Section emoji="📖" title="どんなアプリ？">
          子どもの毎日の練習・お手伝いなどを、スタンプを貯めて記録する習慣化アプリです。ログイン不要で、共有リンクを開くだけで使えます。全部達成すると好きな色のドラゴンやペガサス、フェアリー、マジカルキャットが育っていきます。
        </Section>

        <Section emoji="🌟" title="1. スケジュールを作る">
          <Step n={1}>トップページの「新しいスケジュールを作る（女の子用／男の子用）」から作成します。</Step>
          <Step n={2}>タイトル、期間（開始日を選ぶと自動で1か月後の前日までが入ります）、やること（教科・習い事など）を設定します。</Step>
          <Step n={3}>保護者用の暗証番号やご褒美（全部達成のお楽しみ）も、ここで設定できます（あとから修正も可能）。</Step>
          <Step n={4}>作ったスケジュールは「共有（AirDropなど）」「LINEでシェア」「リンクをコピー」からお子さんの端末に送れます。</Step>
        </Section>

        <Section emoji="✅" title="2. 毎日スタンプを押す">
          今日のマスは「本スタンプ」です。押すとその日の記録として残ります。今日以外の日は自由に「仮スタンプ（練習用）」で遊べます。
          <br />
          <br />
          もし前の日に押し忘れがあった場合、保護者が🔒マークからロックを解除すると、過去の日にも本スタンプを押せるようになります。1回押すと記録、もう1回押すと押し忘れていた別の日を1日分「取り戻す」演出が出ます。
        </Section>

        <Section emoji="🥚" title="3. 卵が育つ・進化する">
          スケジュールを作ると、ランダムな色の卵が割り当てられます（ドラゴン・ペガサス・フェアリー・マジカルキャットの全11種類）。達成率が上がるごとに卵→赤ちゃん→…→マスターへと成長します。
          <br />
          <br />
          卵がかえると名前をつけられます（デフォルトは「レッドドラゴン」のような色+種族名）。それより後の成長では「〇〇の様子が…」という確認が出て、「声をかける」を押すと進化の演出が見られます（お子さんが見るまで「放っておく」ことも可能です）。
          <br />
          <br />
          スケジュールが30日以上・スタンプ50個以上のときに100%達成すると、育ったキャラのカードがもらえます。
        </Section>

        <Section emoji="📝" title="4. メモ・コメント">
          各日付の「📝メモ」から、お子さんが「やったこと・感想」を書けます。
          <br />
          <br />
          保護者や祖父母、塾の先生などは「📋記録を見る」から記録を一覧で見て、それぞれの日の記録に「💬返信する」でコメント（名前＋コメント）を残せます。暗証番号は不要なので、リンクを知っている人なら誰でもコメントできます。
        </Section>

        <Section emoji="🎀" title="5. スタンプ帳（複数のスケジュールをまとめる）">
          トップページの「スタンプ帳をつくる」から、お子さんの名前や生年月日を登録できます。作ったスタンプ帳に複数のスケジュールを紐づけると、貯めたスタンプの合計や、達成してもらった育成キャラのカード（🎴集めたカード）が1か所にまとまります。
          <br />
          <br />
          景品と交換する仕組みもあり、貯めたスタンプを使って登録した景品と交換できます。
        </Section>

        <Section emoji="🔒" title="保護者だけができること">
          スケジュール画面右上の🔒（または鍵アイコン）から暗証番号を入れて解除すると、以下ができます。
          <br />
          <br />
          ・今日以外の日にも本スタンプを押す／取り戻す
          <br />
          ・スケジュールの内容を修正する
          <br />
          <br />
          ※暗証番号を忘れたときの共通のマスター番号は「5963」です。
          <br />
          ※「見る」一覧の🗑ボタンは、その端末の表示から外すだけです。スケジュール自体を完全に削除したい場合は、スケジュールを開いてその中の「🗑削除する」から行ってください。
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
