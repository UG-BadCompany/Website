import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login",
  description: "Portal entry point for T&A Contracting clients, admins, and workers.",
};

export default function LoginPage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Portal login</p>
      <h1>Client, admin, and worker access.</h1>
      <div className="auth-grid">
        <form className="form-card" action="/api/auth/login" method="post">
          <h2>Sign in</h2>
          <label>Email<input name="email" type="email" required /></label>
          <label>Password<input name="password" type="password" required /></label>
          <button className="button" type="submit">Sign In</button>
          <Link href="/login#reset">Need a password reset?</Link>
        </form>

        <form className="form-card" action="/api/auth/register" method="post">
          <h2>Create account</h2>
          <label>Name<input name="name" required /></label>
          <label>Email, if available<input name="email" type="email" /></label>
          <label>Phone, if available<input name="phone" type="tel" /></label>
          <label>Role<select name="role"><option value="client">Client</option><option value="admin">Admin</option><option value="worker">Worker</option></select></label>
          <label>Password<input name="password" type="password" required /></label>
          <button className="button" type="submit">Create Portal Account</button>
        </form>
      </div>

      <form id="reset" className="form-card compact-form" action="/api/auth/password-reset" method="post">
        <h2>Password reset</h2>
        <p>Password reset requests are recorded and queued for email delivery when an email provider is configured.</p>
        <label>Email<input name="email" type="email" required /></label>
        <button className="button button-secondary" type="submit">Request Reset</button>
      </form>
    </section>
  );
}
