import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about T&A Contracting's Arizona-native contractor identity and professional maintenance process.",
};

export default function AboutPage() {
  return (
    <section className="section-wrap page-top split">
      <div>
        <p className="eyebrow">About T&A Contracting</p>
        <h1>Local, practical, dependable, and built for professional property care.</h1>
        <p className="lead">T&A Contracting is positioned for customers who need more organization and capability than a basic handyman service: homeowners with repair lists, landlords handling turns, property managers coordinating maintenance, and small businesses protecting their spaces.</p>
      </div>
      <div className="stacked-cards">
        <article className="card"><h2>Professional</h2><p>Clear requests, quote records, status updates, documentation, and payment workflows.</p></article>
        <article className="card"><h2>Approachable</h2><p>Simple language, practical recommendations, and direct calls to action on every page.</p></article>
        <article className="card"><h2>Arizona-native</h2><p>Southwest colors, desert-inspired visuals, and local service positioning.</p></article>
      </div>
    </section>
  );
}
