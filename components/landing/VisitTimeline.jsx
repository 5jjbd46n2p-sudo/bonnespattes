// « Une visite, concrètement » : déroulé vertical à filets (pas de cartes).
const STEPS = [
  { title: "Arrivée et premier contact", text: "Je m'annonce calmement et je laisse votre animal venir à moi." },
  { title: "Eau et repas", text: "Eau fraîche et repas selon vos consignes." },
  { title: "Litière ou balade", text: "La litière pour les chats, une vraie balade en laisse pour les chiens." },
  { title: "Jeu et câlins", text: "Au rythme de votre animal, selon son caractère et son âge." },
  { title: "Un coup d'œil à la maison", text: "Je vérifie que tout est en ordre avant de repartir." },
  { title: "Compte rendu et photos", text: "Ils vous attendent dans votre espace client après mon passage." },
];

export default function VisitTimeline() {
  return (
    <section aria-labelledby="visite" className="px-4 py-12 md:py-16">
      <div className="max-w-2xl mx-auto">
        <h2 id="visite" className="font-display text-2xl md:text-3xl font-semibold mb-8">
          Une visite, concrètement
        </h2>
        <ol className="relative border-l border-trait ml-1 space-y-7">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative pl-6">
              <span
                aria-hidden="true"
                className={`absolute -left-[5px] top-[7px] w-[9px] h-[9px] rounded-full ${i === 0 || i === STEPS.length - 1 ? "bg-rouille" : "bg-trait"}`}
              />
              <h3 className="font-bold">{s.title}</h3>
              <p className="text-pierre mt-1 leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
