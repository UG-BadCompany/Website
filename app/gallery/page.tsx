import type { Metadata } from "next";
import { galleryProjects } from "../components/site-data";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Recent work and before/after gallery layout for T&A Contracting project photos.",
};

export default function GalleryPage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Gallery / Recent Work</p>
      <h1>Before-and-after project proof, ready for real photos.</h1>
      <p className="lead">These cards are prepared for completed work photos, captions, and categories once project images are available.</p>
      <div className="gallery-grid">
        {galleryProjects.map((project) => (
          <article className="gallery-card" key={project.title}>
            <div className="photo-placeholder">Project Photo</div>
            <p>{project.category}</p>
            <h2>{project.title}</h2>
            <span>{project.detail}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
