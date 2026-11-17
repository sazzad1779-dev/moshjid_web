import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ChartShell from '../components/ChartShell.jsx'
import TableShell from '../components/TableShell.jsx'
import StatusDot from '../components/StatusDot.jsx'
import { COLORS } from '../constants.js'
import { formatDate, formatTaka } from '../utils/formatters.js'

const HADITH = [
  {
    text: "সদকা মানুষের সম্পদ কমায় না। কেউ ক্ষমা করে দিলে আল্লাহ তাকে সম্মানে বাড়িয়ে দেন। আর কেউ আল্লাহর জন্য বিনয়ী হলে আল্লাহ তাকে উন্নত করেন।",
    ref: "সহীহ মুসলিম ২৫৮৮",
    source: "হাদিস"
  },
  {
    text: "যেদিন আল্লাহর আরশের ছায়া ছাড়া আর কোনো ছায়া থাকবে না, সেদিন আল্লাহ সাত শ্রেণীর মানুষকে তাঁর বিশেষ ছায়ায় আশ্রয় দেবেন। আর এই মহাসৌভাগ্যবানদের অন্যতম হলেন সেই গোপন দানকারী — যে এত গোপনে দান করে যে তার ডান হাত কী দান করল, বাম হাত তা জানতে পারে না।",
    ref: "সহীহ বুখারি ৬৬০",
    source: "হাদিস"
  },
  {
    text: "আল্লাহর পথে খরচ করার ব্যাপারে তাড়াতাড়ি করবে (অর্থাৎ মৃত্যু অথবা রোগ-শোক হবার আগে)। কারণ দান সদাক্বাহ্ (সাদাকা) করলে বালা-মুসীবাত বৃদ্ধি পায় না (অর্থাৎ দান সদাক্বায় বালা-মুসীবাত দূর হয়)",
    ref: "মিশকাতুল মাসাবীহ ১৮৮৭",
    source: "হাদিস"
  }
]


const QURAN = [
  {
    arabic: "مَّثَلُ ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ ٱللَّهِ كَمَثَلِ حَبَّةٍ أَنۢبَتَتْ سَبْعَ سَنَابِلَ فِى كُلِّ سُنۢبُلَةٍۢ مِّا۟ئَةُ حَبَّةٍۢ ۗ وَٱللَّهُ يُضَـٰعِفُ لِمَن يَشَآءُ ۗ وَٱللَّهُ وَٰسِعٌ عَلِيمٌ ٢٦١",
    bangla: "যারা আল্লাহর পথে তাদের সম্পদ ব্যয় করে, তাদের দৃষ্টান্ত একটি বীজের মতো যা সাতটি শীষ উৎপন্ন করে, প্রতিটি শীষে একশত দানা। আল্লাহ যাকে ইচ্ছা বহুগুণ বাড়িয়ে দেন।",
    surah: "সূরা আল-বাকারাহ ২:২৬১",
    theme: "বহুগুণ প্রতিদান"
  },
  {
    arabic: "وَأَنفِقُوا۟ مِن مَّا رَزَقْنَـٰكُم مِّن قَبْلِ أَن يَأْتِىَ أَحَدَكُمُ ٱلْمَوْتُ فَيَقُولَ رَبِّ لَوْلَآ أَخَّرْتَنِىٓ إِلَىٰٓ أَجَلٍۢ قَرِيبٍۢ فَأَصَّدَّقَ وَأَكُن مِّنَ ٱلصَّـٰلِحِينَ ١٠",
    bangla: "আর তোমরা আমি যা কিছু তোমাদেরকে দিয়েছি তা থেকে ব্যয় করো, তার আগেই যে, তোমাদের কারও মৃত্যু এসে যায়।",
    surah: "সূরা আল-মুনাফিকুন ৬৩:১০",
    theme: "সময়ের আগে দান"
  },
  {
    arabic: "ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُم بِٱلَّيْلِ وَٱلنَّهَارِ سِرًّۭا وَعَلَانِيَةًۭ فَلَهُمْ أَجْرُهُمْ عِندَ رَبِّهِمْ وَلَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ ٢٧٤",
    bangla: "যারা রাতে ও দিনে, গোপনে ও প্রকাশ্যে তাদের সম্পদ ব্যয় করে — তাদের জন্য তাদের প্রতিপালকের নিকট রয়েছে পুরস্কার। তাদের কোনো ভয় নেই, তারা দুঃখিত হবে না।",
    surah: "সূরা আল-বাকারাহ ২:২৭৪",
    theme: "নির্ভয়তা"
  }
]

export default function Home({ rows = [] }) {
  const recent = [...rows]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)

  return (
    <div className="page">

      <ChartShell title="Recent transactions" subtitle="Latest 10 financial activities" action={
        <Link className="text-link" to="/transactions">View all <ArrowRight size={16} aria-hidden="true" /></Link>
      }>
        <TableShell
          data={recent}
          columns={[
            { header: 'Date', key: 'date', width: '120px', render: r => formatDate(r.date) },
            { header: 'Type', key: 'type', render: r => <StatusDot type={r.type} /> },
            { header: 'Category', key: 'category' },
            { header: 'Amount', key: 'amount', align: 'right',
              render: r => <strong style={{ color: r.type === 'income' ? COLORS.income : COLORS.expense }}>{formatTaka(r.amount)}</strong> },
            { header: 'Note', key: 'note' },
          ]}
        />
      </ChartShell>

      {/* ── Quran Verses ── */}
      <ChartShell title="কুরআনের আয়াত" subtitle="দান ও সদকা সম্পর্কে মহান আল্লাহর বাণী">
        <div style={{ display: 'grid', gap: 16 }}>
          {QURAN.map((q, i) => (
            <div key={i} style={{
              background: 'var(--c-surface-2)', borderRadius: 14, padding: '20px 22px',
              border: '1px solid var(--c-border)', borderRight: `4px solid ${COLORS.income}`
            }}>
              <div style={{ fontSize: 20, color: 'var(--c-primary)', fontWeight: 700, marginBottom: 10, fontFamily: 'Traditional Arabic, serif', lineHeight: 1.8, direction: 'rtl' }}>
                {q.arabic}
              </div>
              <div style={{ fontSize: 14, color: 'var(--c-ink-2)', lineHeight: 1.8, marginBottom: 10 }}>
                {q.bangla}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--c-muted-2)', fontWeight: 600 }}>{q.surah}</span>
                <span style={{ fontSize: 11, color: 'var(--c-income)', background: 'var(--tint-income)', padding: '4px 10px', borderRadius: 12, fontWeight: 700 }}>
                  {q.theme}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ChartShell>

      {/* ── Hadith ── */}
      <ChartShell title="হাদিস শরিফ" subtitle="নবী করিম (সা.)-এর বাণী">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
          {HADITH.map((h, i) => (
            <div key={i} style={{
              background: 'var(--tint-warning)', borderRadius: 14, padding: '22px 20px',
              border: '1px solid var(--tint-warning-border)', position: 'relative'
            }}>
              <div style={{ fontSize: 32, position: 'absolute', top: 10, right: 14, opacity: 0.2, color: 'var(--c-gold)' }}>❝</div>
              <div style={{ fontSize: 14, color: 'var(--c-ink-2)', lineHeight: 1.8, marginBottom: 14, fontStyle: 'italic' }}>
                {h.text}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--c-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h.source}</span>
                <span style={{ fontSize: 12, color: 'var(--c-gold)', fontWeight: 600 }}>{h.ref}</span>
              </div>
            </div>
          ))}
        </div>
      </ChartShell>

      {/* ── Call to Action ── */}
      <div style={{
        background: 'var(--grad-brand)',
        borderRadius: 16, padding: '28px 24px', textAlign: 'center', color: '#fff'
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          মসজিদের উন্নয়নে আপনার সদকায়ে জারিয়াহ দিন
        </div>
        <div style={{ fontSize: 14, color: '#e9f5ea', lineHeight: 1.7, maxWidth: 500, margin: '0 auto' }}>
          "মানুষ মরে গেলে তার সব আমল শেষ হয়ে যায়, কিন্তু তিনটি আমল বাদে — সদকায়ে জারিয়া, উপকারী জ্ঞান এবং সৎ সন্তানের দোয়া।"
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--c-primary-soft)', opacity: 0.9 }}>
          — সহীহ মুসলিম ১৬৩১
        </div>
      </div>
    </div>
  )
}
