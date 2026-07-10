import React from 'react'
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

বকনা-বাছুর (২:২৭৪) 
"ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُم بِٱلَّيْلِ وَٱلنَّهَارِ سِرًّۭا وَعَلَانِيَةًۭ فَلَهُمْ أَجْرُهُمْ عِندَ رَبِّهِمْ وَلَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ ٢٧٤"
যারা নিজেদের মাল রাতে ও দিনে, প্রকাশ্যে অপ্রকাশ্যে ব্যয় করে থাকে, তাদের জন্য সেই দানের সওয়াব তাদের প্রতিপালকের নিকট রয়েছে এবং তাদের কোন ভয় নেই, তারা চিন্তিতও হবে না।
— Taisirul Quran



https://quran.com/bn/al-baqarah/274

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

const FEATURES = [
  { icon: '🔍', title: 'স্বচ্ছ হিসাব', desc: 'প্রতিটি টাকার উৎস ও খরচের বিবরণ সবার সামনে খোলা' },
  { icon: '🏦', title: 'মাসিক পরিকল্পনা', desc: 'মাস ভিত্তিক আয়-ব্যয় বিশ্লেষণ ও ভবিষ্যৎ পরিকল্পনা' },
  { icon: '🤲', title: 'জমিয়াতুল ফয়দ', desc: 'সদকায়ে জারিয়াহর মাধ্যমে নেকি অর্জন' },
  { icon: '⏱️', title: 'রিয়েল-টাইম', desc: 'রিয়েল-টাইম তথ্য আপডেট' },
]

export default function Home({ rows = [] }) {
  const recent = [...rows]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* ── Hero Message ── */}
      <ChartShell title="" style={{ textAlign: 'center', padding: '40px 30px', background: 'linear-gradient(135deg, #193f2a 0%, #2f6b3f 100%)' }}>

        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.4 }}>
          "দান দেখুন, খরচ জানুন, মসজিদ গড়ুন"
        </h2>
        <p style={{ color: '#e9f5ea', fontSize: 16, marginTop: 14, maxWidth: 600, margin: '14px auto 0', lineHeight: 1.7 }}>
          আমাদের এই ছোট্ট প্রচেষ্টা — মসজিদের প্রতিটি টাকার হিসাব সবার সামনে খোলা রাখা।
          আপনার দান, আমাদের দায়িত্ব। আল্লাহ কবুল করুন।
        </p>
      </ChartShell>

      {/* ── Features ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {FEATURES.map((f, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 16, padding: '24px 20px',
            boxShadow: '0 10px 25px rgba(14,29,20,0.06)', border: '1px solid #eef2f5',
            textAlign: 'center', transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1d4f2f', marginBottom: 6 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: '#5f6b7a', lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Quran Verses ── */}
      <ChartShell title="কুরআনের আয়াত" subtitle="দান ও সদকা সম্পর্কে মহান আল্লাহর বাণী">
        <div style={{ display: 'grid', gap: 16 }}>
          {QURAN.map((q, i) => (
            <div key={i} style={{
              background: '#f8fafc', borderRadius: 14, padding: '20px 22px',
              border: '1px solid #eef2f5', borderRight: `4px solid ${COLORS.income}`
            }}>
              <div style={{ fontSize: 20, color: '#1d4f2f', fontWeight: 700, marginBottom: 10, fontFamily: 'Traditional Arabic, serif', lineHeight: 1.8, direction: 'rtl' }}>
                {q.arabic}
              </div>
              <div style={{ fontSize: 14, color: '#344150', lineHeight: 1.8, marginBottom: 10 }}>
                {q.bangla}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#8898aa', fontWeight: 600 }}>{q.surah}</span>
                <span style={{ fontSize: 11, color: COLORS.income, background: '#e8f5e9', padding: '4px 10px', borderRadius: 12, fontWeight: 700 }}>
                  {q.theme}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ChartShell>

      {/* ── Hadith ── */}
      <ChartShell title="হাদিস শরিফ" subtitle="নবী করিম (সা.)-এর বাণী">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {HADITH.map((h, i) => (
            <div key={i} style={{
              background: '#fff8e1', borderRadius: 14, padding: '22px 20px',
              border: '1px solid #ffecb3', position: 'relative'
            }}>
              <div style={{ fontSize: 32, position: 'absolute', top: 10, right: 14, opacity: 0.15, color: '#a67c2b' }}>❝</div>
              <div style={{ fontSize: 14, color: '#5d4037', lineHeight: 1.8, marginBottom: 14, fontStyle: 'italic' }}>
                {h.text}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#8a6a2b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h.source}</span>
                <span style={{ fontSize: 12, color: '#a67c2b', fontWeight: 600 }}>{h.ref}</span>
              </div>
            </div>
          ))}
        </div>
      </ChartShell>

      {/* ── Call to Action ── */}
      <div style={{
        background: 'linear-gradient(120deg, #2f6b3f 0%, #a67c2b 100%)',
        borderRadius: 16, padding: '28px 24px', textAlign: 'center', color: '#fff'
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          মসজিদের উন্নয়নে আপনার সদকায়ে জারিয়াহ দিন
        </div>
        <div style={{ fontSize: 14, color: '#e9f5ea', lineHeight: 1.7, maxWidth: 500, margin: '0 auto' }}>
          "মানুষ মরে গেলে তার সব আমল শেষ হয়ে যায়, কিন্তু তিনটি আমল বাদে — সদকায়ে জারিয়া, উপকারী জ্ঞান এবং সৎ সন্তানের দোয়া।"
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: '#d6e7d3', opacity: 0.8 }}>
          — সহীহ মুসলিম ১৬৩১
        </div>
      </div>

      <ChartShell title="Recent Transactions" subtitle="Latest 10 financial activities">
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
    </div>
  )
}
