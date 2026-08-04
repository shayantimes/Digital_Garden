import { GardenHomeContent } from "./components/garden-home-content";

export default function Home() {
  return (
    <main className="home-notes">
      <section className="home-notes-heading" aria-labelledby="home-title">
        <h1 id="home-title">Shayan</h1>
      </section>
      <GardenHomeContent />
      <footer>
        <span>Digital garden</span>
      </footer>
    </main>
  );
}
