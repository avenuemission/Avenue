import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import GuideNav from "./GuideNav";
import {
  APEST,
  APPRENTICE_STEPS,
  BIG_MOMENTS,
  BLESS,
  BOARD_ASKS,
  BOARD_ROLES,
  DNA,
  GUIDE_CHAPTERS,
  LEADERSHIP_VALUES,
  MISSION_DEED,
  MISSION_EXAMPLES,
  MISSION_PLACES,
  MISSION_QUESTIONS,
  MISSION_WORD,
  PATHWAY_RHYTHMS,
  PRAYER_AND_PRAISE,
  UP_IN_OUT,
  VALUES,
  WINS,
  type Expression,
} from "@/content/training/missionGuide";

// The Avenue Mission Guide's body, from the cover to the footer. The page
// wraps it in the full-access gate and the journey header. The lists live
// in content/training/missionGuide.ts.

export const TRAINING_HREF = "/leaders/training?phase=phase1";

// ---------- small building blocks ----------

function Chapter({ id, label, title, children }: { id: string; label: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-[var(--line)] pt-14 pb-2">
      <p className="night-label !text-[var(--lamp)]">{label}</p>
      <h2 className="mt-2 font-sans text-[clamp(26px,5vw,38px)] font-bold uppercase leading-[1.08] tracking-tight text-[var(--ink)]">
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-[var(--ink-2)] leading-relaxed">{children}</div>
    </section>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return <h3 className="!mt-10 font-sans text-lg font-semibold text-[var(--ink)] md:text-xl">{children}</h3>;
}

function Lead({ children }: { children: ReactNode }) {
  return <p className="text-lg text-[var(--ink)]">{children}</p>;
}

function Statement({ children }: { children: ReactNode }) {
  return (
    <p className="font-serif text-[clamp(22px,4vw,30px)] leading-snug text-[var(--ink)]">
      <span className="text-[var(--lamp)]">› </span>
      {children}
    </p>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return <div className="night-card p-5 text-[var(--ink-2)]">{children}</div>;
}

function Point({ children }: { children: ReactNode }) {
  return (
    <div className="!mt-10 rounded-r-[18px] border-l-2 border-[var(--lamp)] bg-[var(--night-2)] p-5">
      <p className="night-label !text-[var(--lamp)]">The point</p>
      <p className="mt-2 text-[var(--ink-2)]">{children}</p>
    </div>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-[var(--lamp)]">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

const named = (items: { name: string; text: string }[]) =>
  items.map((item) => (
    <Fragment key={item.name}>
      <strong className="font-semibold text-[var(--ink)]">{item.name}:</strong> {item.text}
    </Fragment>
  ));

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-[15px] leading-normal">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="night-label border-b border-[var(--line)] py-3 pr-4 text-left font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className="border-b border-[var(--line)] py-3 pr-4 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ICON_PATHS: Record<Expression, ReactNode> = {
  intersection: <path d="M14 24V4M7 11l7-7 7 7" />,
  pathways: <path d="M4 14h7M24 14h-7M8 10l4 4-4 4M20 10l-4 4 4 4" />,
  streetlights: (
    <>
      <circle cx="14" cy="14" r="4" />
      <path d="M14 2v4M14 22v4M2 14h4M22 14h4M5.5 5.5l2.8 2.8M19.7 19.7l2.8 2.8M5.5 22.5l2.8-2.8M19.7 8.3l2.8-2.8" />
    </>
  ),
};

// The road to the light: the guide's cover picture, in the night palette.
function RoadToLight() {
  const lamps: [number, number, number][] = [
    [168, 205, 2],
    [232, 205, 2],
    [142, 236, 3],
    [258, 236, 3],
    [104, 280, 4.5],
    [296, 280, 4.5],
    [46, 346, 6.5],
    [354, 346, 6.5],
  ];
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="guide-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffc56b" stopOpacity={0.85} />
          <stop offset="1" stopColor="#ffc56b" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="#0a0e16" />
      <circle cx="200" cy="150" r="70" fill="url(#guide-glow)" opacity={0.5} />
      <path d="M200 112v52M184 128h32" stroke="#ffc56b" strokeWidth={4} strokeLinecap="round" />
      <path d="M0 400L196 175h8L400 400z" fill="#1b2230" />
      <path d="M200 182v14M200 214v22M200 262v34M200 330v50" stroke="#05070c" strokeWidth={3} strokeLinecap="round" />
      <g stroke="#566074" strokeWidth={1.5}>
        {lamps.map(([x, y, r]) => (
          <path key={`p${x}`} d={`M${x} ${y}v${r * 7 + 2}`} />
        ))}
      </g>
      <g fill="url(#guide-glow)" opacity={0.7}>
        {lamps.slice(2).map(([x, y, r]) => (
          <circle key={`g${x}`} cx={x} cy={y} r={r * 5} />
        ))}
      </g>
      <g fill="#ffc56b">
        {lamps.map(([x, y, r]) => (
          <circle key={`l${x}`} cx={x} cy={y} r={r} />
        ))}
      </g>
    </svg>
  );
}

// The three wins as one loop: belong, commit, step out, and back again.
function MultiplicationLoop() {
  const boxes: [number, string, string][] = [
    [16, "PATHWAYS", "Belong + invite"],
    [226, "INTERSECTION", "Commit + apprentice"],
    [436, "STREETLIGHTS", "Step out + start"],
  ];
  return (
    <div
      className="night-card overflow-x-auto p-3"
      role="img"
      aria-label="The multiplication loop: belong and invite, then commit and be apprenticed, then step out and start something new, which leads back to someone new belonging."
    >
      <svg viewBox="0 0 620 230" fill="none" className="block h-auto w-full min-w-[420px]">
        <defs>
          <marker id="guide-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5 0 10z" fill="#ffc56b" />
          </marker>
        </defs>
        <g textAnchor="middle" fontFamily="var(--font-geist-sans), system-ui, sans-serif">
          {boxes.map(([x, label, text]) => (
            <g key={label}>
              <rect x={x} y="40" width="168" height="88" rx="14" fill="#05070c" stroke="#263042" />
              <text x={x + 84} y="74" fontSize="11" fontWeight={600} letterSpacing="2" fill="#ffc56b">
                {label}
              </text>
              <text x={x + 84} y="98" fontSize="16" fontWeight={700} fill="#eef1f7">
                {text}
              </text>
            </g>
          ))}
          <text x="310" y="212" fontSize="13" fill="#8b94a7">
            something new, where the next person can belong
          </text>
        </g>
        <path d="M186 84h36" stroke="#ffc56b" strokeWidth={2} markerEnd="url(#guide-arrow)" />
        <path d="M396 84h36" stroke="#ffc56b" strokeWidth={2} markerEnd="url(#guide-arrow)" />
        <path
          d="M520 130v40q0 20-20 20H120q-20 0-20-20v-36"
          stroke="#ffc56b"
          strokeWidth={2}
          strokeDasharray="5 5"
          markerEnd="url(#guide-arrow)"
        />
      </svg>
    </div>
  );
}

// ---------- the guide ----------

export default function MissionGuide() {
  return (
    <>
    {/* Cover */}
    <div className="mt-6 grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
      <div className="min-w-0">
        <p className="eyebrow">Training module · Mission Guide</p>
        <h1 className="mt-2 font-sans text-[clamp(32px,7vw,56px)] font-bold uppercase leading-[1.05] tracking-tight text-[var(--ink)]">
          We&apos;re not the destination.
        </h1>
        <p className="mt-5 max-w-[34em] text-lg text-[var(--muted)]">
          This is the guide to Avenue&apos;s mission and the strategy behind it: how we unleash God-given potential
          and multiply disciples, leaders and Pathways. It&apos;s built around three expressions, and the wins
          we&apos;re chasing in each.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
          {DNA.map((d) => (
            <span key={d.id} className="night-label flex items-center gap-2 !text-[var(--ink)]">
              <span className="h-2 w-2 rounded-full bg-[var(--lamp)] shadow-[0_0_10px_var(--lamp)]" />
              {d.name}
            </span>
          ))}
        </div>
      </div>
      <div className="aspect-[16/10] w-full overflow-hidden rounded-[18px] border border-[var(--line)] md:aspect-square">
        <RoadToLight />
      </div>
    </div>

    <div className="lg:grid lg:grid-cols-[180px_minmax(0,680px)] lg:justify-center lg:gap-12">
      <GuideNav chapters={GUIDE_CHAPTERS} />
      <div className="mx-auto max-w-[680px] lg:mx-0">
      <Chapter id="preamble" label="The Preamble" title="Who we are">
        <Sub>The Avenue name: we&apos;re not the destination</Sub>
        <p>
          An avenue is the road to somewhere significant. It&apos;s never the destination. Our name reminds us that
          the mission isn&apos;t about Avenue. It&apos;s about the kingdom of Jesus, which we get to be part of now
          and look forward to in full. We exist to point people to Jesus as Lord and equip them for the purpose God
          has called them to.
        </p>

        <Sub>Vision (where we&apos;re going)</Sub>
        <Statement>To become an expanding network of missional micro-communities.</Statement>
        <p>
          We believe the Kingdom of God expands through Spirit-filled followers of Jesus who want the gospel to reach
          every heart and every corner of life. We&apos;ll see it happen as missional micro-communities reproduce,
          meeting new needs and reaching new groups of people.
        </p>

        <Sub>Mission (what we&apos;re doing)</Sub>
        <Statement>To unleash God-given potential.</Statement>
        <p>
          Avenue started with a simple realisation: God-given potential is already sitting in the hearts of people
          around us. It needs to be intentionally nourished and directed so people step into what God actually wants
          to do through their lives.
        </p>
        <p>
          We do this by growing Spirit-filled disciples and leaders who worship Jesus as Lord, live in small
          communities and engage in missional living. It takes patience, a lot of failures, and a lifetime of
          faithfulness and humility.
        </p>
        <p>What it looks like:</p>
        <Bullets items={MISSION_EXAMPLES} />
        <Callout>
          Everyone at Avenue, not just leaders, should be able to say it:{" "}
          <strong className="text-[var(--ink)]">we exist to unleash God-given potential.</strong>
        </Callout>

        <Sub>Values</Sub>
        <Table
          head={["Value", "What it means"]}
          rows={VALUES.map((v) => [
            <span key="v" className="whitespace-nowrap">
              <strong className="text-[var(--ink)]">{v.name}</strong> {v.rest}
            </span>,
            v.meaning,
          ])}
        />
      </Chapter>

      <Chapter id="dna" label="The DNA" title="Three expressions, one road">
        <Lead>
          Avenue is built on three expressions that line up with the avenue picture: we walk the pathway together, meet
          God with other disciples at the intersection, and become streetlights in a world that needs more of the light
          of Jesus.
        </Lead>
        <div className="grid gap-3 md:grid-cols-3">
          {DNA.map((d) => (
            <div key={d.id} className="night-card flex flex-col gap-2 p-5">
              <svg
                viewBox="0 0 28 28"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="h-7 w-7 text-[var(--lamp)]"
                aria-hidden="true"
              >
                {ICON_PATHS[d.id]}
              </svg>
              <span className="night-label !text-[var(--lamp)]">{d.direction}</span>
              <span className="font-sans text-lg font-bold text-[var(--ink)]">{d.name}</span>
              <p className="text-[15px]">{d.text}</p>
              <span className="mt-auto border-t border-[var(--line)] pt-2 text-sm text-[var(--muted)]">{d.where}</span>
            </div>
          ))}
        </div>
        <p>
          Every ministry at Avenue exists to serve the core purpose of one expression. There&apos;ll always be
          overflow into the others, and that&apos;s good. But each initiative needs to be clear about which one
          it&apos;s mainly there for.
        </p>
      </Chapter>

      <Chapter id="metrics" label="Metrics of Success" title="We count stories, not seats">
        <Lead>
          We don&apos;t measure success by how many people show up. We measure it by people moving: belonging,
          committing, then stepping out to lead. Each expression has one win we celebrate and track by name.
        </Lead>
        <div className="flex flex-col gap-3">
          {WINS.map((w) => (
            <div key={w.name} className="night-card grid gap-2 p-5 sm:grid-cols-[150px_1fr] sm:gap-4">
              <div>
                <span className="block font-sans text-lg font-bold text-[var(--ink)]">{w.name}</span>
                <span className="night-label !text-[var(--lamp)]">{w.verb}</span>
              </div>
              <p>{w.text}</p>
            </div>
          ))}
        </div>
        <p>
          Read together, these three wins are one multiplication loop. Someone belongs, so they invite. Someone
          commits to Jesus, so they get apprenticed. Someone is apprenticed, so they eventually start something new,
          where the next person can belong.
        </p>
        <MultiplicationLoop />
        <p>
          Notice that every win ends with someone else being reached or led. A decision of faith isn&apos;t the
          finish line. It&apos;s the start of an apprenticeship.
        </p>
        <Callout>
          <strong className="text-[var(--ink)]">How we track it:</strong> Pathway leaders name the people who fit
          each metric, and we review them together at Pathway Huddles. We count stories, not seats.
        </Callout>
      </Chapter>

      <Chapter id="pathways" label="Section 1 · Community" title="Pathways">
        <Lead>
          Pathways are the engine room of Avenue: missional micro-churches that follow Jesus together, worship him,
          join him on mission, and multiply. The church isn&apos;t a building or an event. It&apos;s people around a
          table.
        </Lead>

        <Sub>Around the table</Sub>
        <p>
          Jesus had some of his most important conversations around a table (Luke 22:7-38), so that&apos;s where we
          disciple too. A Pathway isn&apos;t just a weekly meeting. It&apos;s a family of disciples becoming more
          like Jesus together, with the connection of a family and a shared mission.
        </p>
        <p>Every Pathway looks a little different, but they share the same rhythms (Acts 2:42):</p>
        <Bullets items={named(PATHWAY_RHYTHMS)} />

        <Sub>Teaching rhythm: the Avenue Podcast</Sub>
        <p>
          The <strong className="text-[var(--ink)]">Avenue Podcast</strong> is the network&apos;s weekly teaching,
          released at the start of each week on the Bible passage for that week. It takes the place of a weekly
          sermon and resources Pathways with shared content, so the whole network is learning the same thing at the
          same time.
        </p>
        <p>
          We recommend every Pathway uses the podcast as the starting point for its gathering: listen during the
          week, then dig into the passage together at the table. It also gives people outside Avenue a window into
          what we&apos;re learning, which makes it easy to share.
        </p>
        <Callout>
          There&apos;s flexibility, though. If the podcast series isn&apos;t the right fit for where a Pathway is
          right now, leaders can choose something else that serves their group better. Talk it through with your
          coach or the Pathways Director, and keep it Jesus-centred and Scripture-rooted.
        </Callout>

        <Sub>APEST: everyone has a part to play</Sub>
        <p>
          Every follower of Jesus is gifted to take part in what God is doing. We don&apos;t want Pathways where one
          person does everything. We use the APEST framework (Ephesians 4:11-13) to help people discover their
          calling and release them to serve:
        </p>
        <Table
          head={["Gift", "What it does"]}
          rows={APEST.map((g) => [<strong key="g" className="text-[var(--ink)]">{g.name}</strong>, g.text])}
        />
        <p>These aren&apos;t roles for pastors or professionals. They&apos;re functions that belong to the whole body.</p>

        <Sub>Apprenticeship and multiplication</Sub>
        <p>
          Every Pathway is a training ground for future leaders. Each leader actively identifies an apprentice,
          someone growing in their faith they can walk alongside. It starts with an ICNU conversation: &ldquo;I see
          in you...&rdquo;. Then the apprentice learns by watching, practising, getting feedback and eventually
          leading:
        </p>
        <ol className="space-y-2">
          {APPRENTICE_STEPS.map((step, i) => (
            <li key={step} className="flex items-baseline gap-4">
              <span className="min-w-[18px] font-sans font-bold text-[var(--lamp)] tabular-nums">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <p>
          This is how we multiply: new leaders starting new Pathways and reaching new people. We grow in depth and
          impact, not just size.
        </p>

        <Sub>Coaching and huddles</Sub>
        <p>
          No leader should lead alone. The Pathways Director oversees a team of coaches, and each coach walks with a
          few Pathway leaders one-on-one. Leaders also gather at regular{" "}
          <strong className="text-[var(--ink)]">Pathway Huddles</strong> to share stories, review our Metrics of
          Success, pray, and train together. We&apos;re still building out this coaching layer, and growing coaches
          is one of our key leadership priorities.
        </p>
        <p>
          Our hope is that everyone at Avenue is in an intentional discipleship relationship, either being discipled
          or discipling someone else, and ideally both.
        </p>

        <Point>
          Pathways are for every stage of faith, from exploring Jesus for the first time to being ready to lead. Week
          by week, table by table, life by life, we&apos;re becoming a multiplying network of Jesus-followers. The
          win we&apos;re looking for here:{" "}
          <strong className="text-[var(--ink)]">
            a new person feels like they belong in a Pathway and is comfortable inviting someone else into the
            community.
          </strong>
        </Point>
      </Chapter>

      <Chapter id="intersection" label="Section 2 · Worship" title="Intersection">
        <Lead>
          Intersection is any time the Avenue community gathers to worship, and our heartbeat is{" "}
          <strong>Wednesday night Prayer and Praise</strong>. We&apos;re not building a big weekend-service-style production.
          We&apos;re building a weekly space where people meet God, get honest in prayer, and get sent back out to
          their Pathways and their streets.
        </Lead>

        <Sub>Why Wednesday night is the rhythm</Sub>
        <p>
          We used to run large quarterly Intersection services. They took a lot of planning, and they mostly drew
          people looking for something to attend rather than a community to belong to. That&apos;s not the fruit
          we&apos;re after.
        </p>
        <p>
          So we&apos;ve shifted our energy. Instead of a few big moments a year, we gather every week for worship
          that&apos;s simple, honest and Spirit-led. Most of our life together still happens in Pathways. Wednesday
          is where those Pathways cross paths and remember they&apos;re part of one bigger mission.
        </p>

        <Sub>What happens at Prayer and Praise</Sub>
        <p>Every Wednesday looks a bit different, but the heart stays the same:</p>
        <Bullets items={named(PRAYER_AND_PRAISE)} />

        <Sub>How it&apos;s led</Sub>
        <p>
          The <strong className="text-[var(--ink)]">Intersection Director</strong> oversees Prayer and Praise and a
          team of <strong className="text-[var(--ink)]">worship leaders</strong> who share the load on a rotating
          roster. Each worship leader owns the week they&apos;re allocated: the theme, the worship set, the
          reflection and the prayer moments. This keeps it sustainable, gives more people a chance to lead, and
          means Prayer and Praise is itself a place where leaders are apprenticed.
        </p>
        <p>
          Everyone else comes as a host, not a guest. Notice who&apos;s new or on the edge, introduce them to
          someone, and stick around after for the conversations that matter.
        </p>

        <Sub>Bigger worship moments</Sub>
        <p>
          We&apos;ll still run larger worship events from time to time, like a baptism celebration or a network-wide
          night. When we do, they get proper planning:
        </p>
        <Bullets items={named(BIG_MOMENTS)} />

        <Point>
          Intersection isn&apos;t the destination either. Its job is to bring people to Jesus and send them deeper
          into a Pathway, where discipleship actually happens. The win we&apos;re looking for here:{" "}
          <strong className="text-[var(--ink)]">
            a person is baptised or makes a decision of faith and is then apprenticed to lead in a Pathway.
          </strong>
        </Point>
      </Chapter>

      <Chapter id="streetlights" label="Section 3 · Mission" title="Streetlights">
        <Lead>
          Jesus called his church to be the light of the world (Matthew 5:14). Streetlights is how we keep our
          attention pointed outwards, sharing his love through what we say and what we do. Mission isn&apos;t an
          extra activity on top of church life. It&apos;s a reorientation of our whole life for the Kingdom.
        </Lead>

        <Sub>Where mission happens</Sub>
        <Bullets items={named(MISSION_PLACES)} />

        <Sub>The BLESS rhythm</Sub>
        <p>Whatever form mission takes, we follow a simple rhythm:</p>
        <ul className="grid grid-cols-5 gap-2">
          {BLESS.map((b, i) => (
            <li key={i} className="night-card px-1 py-3 text-center text-xs sm:text-sm">
              <b className="block font-sans text-2xl leading-tight text-[var(--lamp)]">{b.letter}</b>
              {b.word}
            </li>
          ))}
        </ul>

        <Sub>Mission through word</Sub>
        <p>
          Every follower of Jesus is a witness, empowered by the Holy Spirit to speak hope and truth into
          people&apos;s lives. Not just through preaching and events, but through everyday conversations, invitations
          and friendships. That might look like:
        </p>
        <Bullets items={MISSION_WORD} />

        <Sub>Mission through deed</Sub>
        <p>
          Jesus didn&apos;t just talk about the Kingdom. He showed it by healing, feeding, defending and serving. We
          want to show up in the broken places of our world, take risks together, and try new ways to live out our
          missional DNA. That might look like:
        </p>
        <Bullets items={MISSION_DEED} />

        <Sub>The questions we keep asking</Sub>
        <Bullets items={MISSION_QUESTIONS} />

        <Point>
          Streetlights is a lifestyle, not a program. The win we&apos;re looking for here:{" "}
          <strong className="text-[var(--ink)]">
            a disciple responds to the Holy Spirit by stepping out to plant, lead or serve in a new Pathways or
            Streetlights initiative.
          </strong>
        </Point>
      </Chapter>

      <Chapter id="leadership" label="Section 4" title="Leadership Guidelines">
        <Lead>
          Leaders at Avenue go first. These guidelines describe the kind of leaders we want to be and to multiply.
          They aren&apos;t rigid rules. They&apos;re principles that reflect the heart of Jesus, with room for grace,
          conversation and growth.
        </Lead>

        <Sub>Leadership values</Sub>
        <ol className="list-decimal space-y-2 pl-5 marker:text-[var(--lamp)]">
          {named(LEADERSHIP_VALUES).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>

        <Sub>UP, IN and OUT</Sub>
        <p>Leaders commit to three directions, matching our DNA.</p>
        {UP_IN_OUT.map((group) => (
          <div key={group.heading} className="space-y-3">
            <h4 className="night-label !mt-6 !text-[var(--ink)]">{group.heading}</h4>
            <Bullets items={named(group.items)} />
          </div>
        ))}
      </Chapter>

      <Chapter id="board" label="Section 5" title="Board Structure">
        <Lead>
          Avenue&apos;s Leadership Board has six positions and provides vision, governance and oversight for all
          church operations, ministries and mission. As part of the Seventh-day Adventist Church, the board reports
          to and works within the policies of the Victorian Conference.
        </Lead>

        <Sub>What we ask of every board member</Sub>
        <Bullets items={BOARD_ASKS} />

        <Sub>Key responsibilities</Sub>
        <div className="border-t border-[var(--line)]">
          {BOARD_ROLES.map((r) => (
            <details key={r.role} className="group border-b border-[var(--line)]">
              <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 py-3 font-sans font-semibold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                {r.role}
                <ChevronRight
                  className="h-4 w-4 flex-none text-[var(--lamp)] transition-transform group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              <div className="pb-4">
                <Bullets items={r.duties} />
              </div>
            </details>
          ))}
        </div>
      </Chapter>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6">
        <p className="text-xs text-[var(--dim)]">Avenue Mission Guide · Leadership training</p>
        <Link
          href={TRAINING_HREF}
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-[var(--muted)] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to training
        </Link>
      </footer>
      </div>
    </div>
    </>
  );
}
