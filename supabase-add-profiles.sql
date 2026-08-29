-- すでに schedules テーブルがある場合は、このファイルの内容だけを
-- SupabaseのSQL Editorに貼り付けて実行してください（Run）。
-- 「スタンプ帳（プロフィール）」機能のための新しいテーブルです。

create table profiles (
  id text primary key,
  blob jsonb not null,
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- リンクを知っている人なら誰でも読み書きできるようにする
-- （ログイン機能はなく、リンクのURLがパスワード代わりになります）
create policy "allow read/write via anon key"
  on profiles
  for all
  using (true)
  with check (true);
