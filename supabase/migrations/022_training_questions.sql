-- APPLIED to the live database 2026-11-12 (14 questions, 10 cards).
-- ============================================================
-- 022 Leader Training questions and discussion cards.
--
-- training_video_questions: one multiple-choice question per Foundations
-- video, shown in a pop-up when a leader ticks the video. Answers are
-- never saved. options is a JSON array of strings; correct_index points at
-- the right one (the page shuffles the order on display).
--
-- training_module_prompts: the static cards. Keys avenue-dna, pathways,
-- intersection, streetlights (under each Foundations module), calling
-- (the Ephesians 4 Discovery Bible Reading) and calling-1 to calling-5
-- (one per Calling section).
--
-- Edit both in the Supabase Table Editor: the site reads them on each page
-- load, so no rebuild is needed. Like every table: RLS on, no policies, no
-- anon or authenticated grants. Leaders read them through
-- GET /api/training-content (requireLeader).
--
-- New tables and seed rows only: safe before the code is live. Re-running
-- leaves edited rows alone (on conflict do nothing).
-- ============================================================

begin;

create table if not exists public.training_video_questions (
  youtube_id text primary key,
  question text not null check (char_length(btrim(question)) > 0),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 5),
  correct_index smallint not null check (correct_index >= 0),
  explanation text not null default '',
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  constraint training_video_questions_correct_in_range check (correct_index < jsonb_array_length(options))
);

create table if not exists public.training_module_prompts (
  module text primary key,
  discussion_question text,
  hint text,
  passage text,
  updated_at timestamptz not null default now()
);

-- updated_at on every edit (set_updated_at() is from 012).
drop trigger if exists training_video_questions_set_updated_at on public.training_video_questions;
create trigger training_video_questions_set_updated_at
  before update on public.training_video_questions
  for each row execute function public.set_updated_at();
drop trigger if exists training_module_prompts_set_updated_at on public.training_module_prompts;
create trigger training_module_prompts_set_updated_at
  before update on public.training_module_prompts
  for each row execute function public.set_updated_at();

alter table public.training_video_questions enable row level security;
alter table public.training_module_prompts enable row level security;
revoke all on public.training_video_questions from anon, authenticated;
revoke all on public.training_module_prompts from anon, authenticated;
grant select, insert, update, delete on public.training_video_questions to service_role;
grant select, insert, update, delete on public.training_module_prompts to service_role;

-- Seed: the correct option is listed first (correct_index 0).
insert into public.training_video_questions (youtube_id, question, options, correct_index, explanation, sort_order) values
  ('-yjMDB8OXsg', 'Avenue sees God-given potential unleashed in three stages. What are they?', '["Individual, disciple, leader", "Attender, member, volunteer", "Youth, young adult, adult"]'::jsonb, 0, 'You step into a new identity, you''re formed into the image of Christ, then you step out and start something.', 1),
  ('etpNJoyRNZ0', 'What makes the Avenue model different from how most churches work?', '["Ordinary people being the church in the spaces they''re already in", "A bigger weekly service with better production", "Professional staff running programs for members"]'::jsonb, 0, 'We''re moving away from depending on a stage or professional clergy, back to the priesthood of all believers. We don''t need new buildings; we occupy the spaces we already have.', 2),
  ('Lkx09wZpFmw', 'Which of these is NOT one of Avenue''s five values?', '["Excellence is our standard", "Multiplication is our mission", "Inclusivity is our culture"]'::jsonb, 0, 'The five are Gospel (our cause), Spirit (our guide), Worship (our response), Multiplication (our mission) and Inclusivity (our culture).', 3),
  ('0EE9n_LEMtw', 'What are the three minimum ingredients for a group to be a church?', '["Worship, community, mission", "A pastor, a building, a band", "Prayer, fasting, giving"]'::jsonb, 0, 'A shared commitment to Jesus as Lord, to one another as family, and to blessing those outside.', 4),
  ('uod2tVf0M6E', 'How does the video describe a new microchurch starting?', '["Like a child growing up and starting their own family", "A split from the original group", "A franchise of the main church"]'::jsonb, 0, 'Multiplying isn''t a split. It''s the natural result of health, and the new family stays connected.', 5),
  ('CDyxXOcMIJw', 'What''s the first step to getting involved in leading?', '["Talk to your Pathway leader and set a SMART plan", "Wait until someone asks you", "Finish all the training first"]'::jsonb, 0, 'Specific, measurable, achievable, relevant, time-based. It turns "one day" into a plan.', 6),
  ('rYxLb_jBdiU', 'Why does every leader look for an apprentice?', '["Doing it all yourself leads to burnout and stunted growth", "So someone can cover when they''re away", "It''s a board rule"]'::jsonb, 0, 'Leaders aren''t leaders if they''re the only ones who can do the job.', 7),
  ('dQTBIhpfpq4', 'What''s the most important skill in leading a discussion?', '["Asking questions that spark deep thinking", "Knowing all the answers", "Keeping it short"]'::jsonb, 0, 'It''s not about having all the information. It''s about helping people reflect and apply it.', 8),
  ('-TEHae7KRx4', 'The video says worship should be…', '["In spirit and in truth, as a living sacrifice", "Only on Wednesday nights", "Mostly through music"]'::jsonb, 0, 'John 4 and Romans 12. Worship is more than a song.', 9),
  ('-Aj49FeIiT8', 'Who are the Streetlights leaders?', '["Everyone in a Pathway", "The director and a small team", "Only people with an evangelism gift"]'::jsonb, 0, '"Go and make disciples" isn''t for the especially keen. It''s the baseline.', 10),
  ('LDbaw6ipOmM', 'What''s the question underneath every Streetlights initiative?', '["Does it share the gospel, plant disciples and multiply the church?", "Will it be popular?", "Has the board approved it?"]'::jsonb, 0, 'No red tape. You need discernment from the Spirit, not permission from a committee.', 11),
  ('rJjcWIlndb4', 'Why does each microchurch define a people and a place?', '["No single microchurch can reach everyone", "To avoid overlapping with other churches", "The conference assigns areas"]'::jsonb, 0, 'Even Jesus invested deeply in twelve.', 12),
  ('qJ6PAfMmACY', 'What does the L in BLESS stand for?', '["Listen with care", "Lead with confidence", "Love your neighbour"]'::jsonb, 0, 'Hear people''s stories without rushing to fix them or preach at them.', 13),
  ('Va4WjPK1U8M', 'What''s the danger of doing mission without community?', '["It can become self-worship and pride", "It runs out of money", "It takes too long"]'::jsonb, 0, 'Stay connected to your Pathway, to Intersection and to God. Apart from him we can do nothing.', 14)
on conflict (youtube_id) do nothing;

insert into public.training_module_prompts (module, discussion_question, hint, passage) values
  ('avenue-dna', 'How would you describe Avenue''s DNA in your own words? How could you see yourself being part of it?', null, 'Acts 2:42–47'),
  ('pathways', 'What makes a Pathway feel like family rather than a meeting? How could you see yourself helping lead one?', null, 'Luke 24:13–35 (the road to Emmaus)'),
  ('intersection', 'What does worship look like for you beyond a song? How could you see yourself helping people meet God at Prayer and Praise?', null, 'Acts 4:23–31 (the believers pray together)'),
  ('streetlights', 'Who are the people God might be sending you to? How could you see yourself stepping out to bless them?', null, 'Luke 10:1–9 (Jesus sends out the 72)'),
  ('calling', null, null, 'Ephesians 4:11–16'),
  ('calling-1', 'What is a calling, in your own words? Which layer (shared, specific or seasonal) do you sense most clearly right now?', 'A calling has three layers: the shared call that never changes, the specific call shaped by your gifts, and the seasonal call for this time and place.', null),
  ('calling-2', 'With the current pattern of your life, have you given space for God to call you into something new that fits his purposes? What might need to shift?', 'Being callable means being willing and available, with room in your life to hear God and respond.', null),
  ('calling-3', 'Where in your life are you in alignment with who God is calling you to be? Where aren''t you aligned?', 'Think about your permanent call to be with Jesus and make disciples as you go.', null),
  ('calling-4', 'What are some of the unique giftings God has given you? How can you use these for Him?', 'Consider your specific spiritual gifts and strengths and how you can use them to equip and serve others and God.', null),
  ('calling-5', 'What are the 1st, 2nd, and 3rd spaces in your life? What might God be calling you to do in one of these spaces?', 'Your home, work and hangout spaces each have an opportunity for you to live out the shared call to make disciples.', null)
on conflict (module) do nothing;

commit;
