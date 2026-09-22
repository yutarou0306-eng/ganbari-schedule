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
          子どもの毎日の練習・お手伝いを、スタンプを貯めて記録する習慣化アプリです。ログイン不要、共有リンクを開くだけで使えます。達成するとファミリアカード（キャラクター）がもらえます。
        </Section>

        <Section id="guide-step1" emoji="🎀" title="1. スタンプ帳を作る">
          <Step n={1}>「スタンプ帳をつくる」から、名前・生年月日・保護者用暗証番号（4〜6桁）を登録します。</Step>
          <Step n={2}>この暗証番号は、新しいスケジュールを作るときにも使います。</Step>
          <Step n={3}>1つのスタンプ帳に複数のスケジュールを紐づけられ、貯めたスタンプや獲得したカードが1か所にまとまります。</Step>
        </Section>

        <Section id="guide-step2" emoji="🌟" title="2. スケジュールを作る">
          <Step n={1}>スタンプ帳の「新しいスケジュールを作る」から（暗証番号が必要です）。</Step>
          <Step n={2}>タイトル・期間・やること（教科・習い事など）を設定します。</Step>
          <Step n={3}>共有リンクでお子さんの端末に送ります。同じリンクを複数の端末で開けば、それぞれで確認・操作できます。</Step>
        </Section>

        <Section id="guide-step3" emoji="🎁" title="3. ご褒美を決める">
          全部達成したときのご褒美と、貯めたスタンプで交換できる景品リストの2種類を設定できます。何が良いかは親子で話し合って決めるのがおすすめです。
          <br />
          <br />
          交換すると履歴（「今もっているスタンプ」右上の📖交換履歴）に残ります。実際に景品を渡したら、丸いスタンプ（印）をタップして「受領印」を押しましょう（暗証番号が必要・押すと取り消せません）。押す前なら「🗑取り消す」でやり直せます。
        </Section>

        <Section id="guide-step4" emoji="✅" title="4. 毎日スタンプを押す">
          今日のマスは「本スタンプ」、それ以外の日は自由に遊べる「仮スタンプ」です。
          <br />
          <br />
          押し忘れがあれば、その日の枠を長押し（またはヘッダーの🔒）→暗証番号で解除すると、過去の日にも本スタンプを押せます。解除は3分間有効で、同じ暗証番号を使う別のスケジュールもその間まとめて解除されます。
        </Section>

        <Section id="guide-step5" emoji="🥚" title="5. 卵が育つ・進化する">
          スケジュールを作るとランダムな卵が割り当たり（男の子・女の子それぞれ5種族）、達成率に応じて卵→…→マスターへ成長します。卵がかえると名前をつけられます。
          <br />
          <br />
          達成率100%でマスター・Lv最大まで育ちますが、スケジュールが30日以上・必要スタンプ50個以上の場合だけ「ファミリアカード」として正式に記録に残ります。それより短い場合も見た目やLVは同じで、「育成中」として表示され続けます。
        </Section>

        <Section id="guide-step6" emoji="📝" title="6. メモ・コメント">
          各日の「📝メモ」に、お子さんがやったこと・感想を書けます。保護者や祖父母などは「📋記録を見る」からコメント（名前＋コメント）を残せます。暗証番号は不要です。
        </Section>

        <Section id="guide-step7" emoji="⚗️" title="7. ファミリア配合（Master同士を組み合わせる）">
          Masterまで育ったカードが2枚以上あると「⚗️配合する」が使えます。「ベース」1枚・「サブ」1枚を選ぶと、サブのLV・ステータスがベースに合算され、サブは消費されます。
          <br />
          <br />
          男の子用の5種族どうしの組み合わせでは、より強い「グランドマスター」に変化することもあります。
        </Section>

        <Section id="guide-step8" emoji="⭐" title="8. ステータスに★を割り振る">
          Master（グランドマスター含む）のカードは、貯めた★をHP・力・守備などのステータスに割り振って強化できます（カード詳細の「⭐ステータスに割り振る」から）。この★は景品交換の★とは別枠です。
        </Section>

        <Section id="guide-parent" emoji="🔒" title="保護者だけができること">
          次の操作には暗証番号（未設定なら確認画面）が必要です。
          <br />
          <br />
          ・過去の日に本スタンプを押す／取り戻す
          <br />
          ・スケジュールの修正・削除
          <br />
          ・受領印を押す／交換を取り消す
          <br />
          ・新しいスケジュールを作る
          <br />
          <br />
          スタンプ帳の暗証番号自体を変えたい場合は、⚙️アイコン→今の暗証番号を入力→「プロフィールを編集する」画面から変更できます。
        </Section>

        <Section id="guide-homescreen" emoji="📱" title="ホーム画面にアプリのように追加する">
          <div style={{ fontWeight: 800, color: "#0B3D62", marginBottom: 4 }}>iPhone（Safari）</div>
          共有アイコン→「ホーム画面に追加」
          <div style={{ fontWeight: 800, color: "#0B3D62", marginTop: 10, marginBottom: 4 }}>Android（Chrome）</div>
          右上「⋮」→「ホーム画面に追加」
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
