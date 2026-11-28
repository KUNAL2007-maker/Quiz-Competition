import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Award, Mail, ShieldCheck, Timer } from 'lucide-react';

const information = {
  about: {
    title: 'About Null Origin',
    intro: 'A competitive quiz platform for students to test their knowledge across timed tournaments.',
    sections: [
      ['Timed questions', 'Choose one option and press Next before the question timer expires. On the last question, choose Submit Quiz. Your host sets the time available per question.'],
      ['Public rankings', 'Anyone can follow the leaderboard. Eligible finishers rank by score, then by time taken across all questions. Equal scores and equal times share a rank.'],
      ['Participation certificates', 'Complete an official competition to earn a participation certificate in your full name. Find your certificates in your signed-in account after the event closes and the remaining attempts finish.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'How Null Origin uses account, competition, and certificate information.',
    sections: [
      ['Account and profile', 'Your verified email identifies your competition entry. Your full name is used on certificates. Your profile also holds your username and the WhatsApp number you provide.'],
      ['Competition records', 'The platform records your attempt, confirmed answers, time taken, completion status, and competition warnings to apply the event rules and calculate standings. The public leaderboard displays your username, score, rank, and elapsed time.'],
      ['Paid events and certificates', 'Organizers can upload an email list for access to a particular paid event. Only authorized organizers should manage that list. Sign into your account to view and download your own certificates.'],
      ['Service providers and questions', 'Firebase supports authentication and database storage. Account messages use the Null Origin sender address. Contact tournament operations for help with your profile, competition records, or certificates.'],
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'Competition entry, timing, fair play, and award eligibility.',
    sections: [
      ['Entry rules', 'Use a verified email and complete your profile before starting an official quiz. Each verified email has one official attempt per competition. Paid events require an eligible registration email.'],
      ['Timing and submission', 'Start during the published entry window. A timely start gives you the full attempt duration, including when entry closes during your attempt. Questions move forward. Confirm your selection before time expires or the question is recorded as unanswered. Refreshing does not restart a timer.'],
      ['Fair play', 'Keep the quiz in the foreground and avoid copying or pasting during an official attempt. The first two distinct incidents produce warnings. A third disqualifies the attempt for that competition. Practice attempts can be repeated.'],
      ['Results and certificates', 'Eligible finishers receive a score even when they answer no questions correctly. Abandoned and disqualified attempts are excluded from rankings and certificates. Correct answers become available after entries close and the remaining attempts end.'],
    ],
  },
};
const icons = [Timer, ShieldCheck, Award];
export default function Info() {
  const key = useLocation().pathname.split('/')[1];
  const content = information[key] || information.about;
  return <article className="origin-info">
    <header><h1>{content.title}</h1><p>{content.intro}</p></header>
    <div className={key === 'about' ? 'origin-info-grid' : 'origin-info-stack'}>{content.sections.map(([title, text], i) => {
      const Icon = icons[i % icons.length];
      return <section key={title}>{key === 'about' && <Icon aria-hidden="true" size={21} />}<h2>{title}</h2><p>{text}</p></section>;
    })}</div>
    <section className="origin-contact"><Mail size={19} /><div><h2>Contact tournament operations</h2><a href="mailto:contact@nullorigin.live">contact@nullorigin.live</a></div></section>
    {key === 'about' && <Link className="origin-primary" to="/competitions">Browse Competitions</Link>}
  </article>;
}
