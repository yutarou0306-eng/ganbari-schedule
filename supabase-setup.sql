-- SupabaseのSQL Editorにこの内容をそのまま貼り付けて実行してください（Run）

create table schedules (
  id text primary key,
  blob jsonb not null,
  updated_at timestamptz not null default now()
);

alter table schedules enable row level security;

-- リンクを知っている人なら誰でも読み書きできるようにする
-- （ログイン機能はなく、リンクのURLがパスワード代わりになります）
create policy "allow read/write via anon key"
  on schedules
  for all
  using (true)
  with check (true);
