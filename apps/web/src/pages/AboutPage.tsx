import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <article className="card page-static">
      <p className="kicker">Notre histoire</p>
      <h1>À propos de PlaceLibre</h1>
      <p>
        PlaceLibre est né à Lyon en 2019, d'une idée simple partagée entre trois
        amis passionnés de culture et de sport : réserver une place pour un
        concert, un match ou une exposition devrait être aussi simple — et aussi
        rassurant — qu'acheter un billet de cinéma.
      </p>
      <p>
        Parti d'un petit carnet d'adresses d'événements locaux, le projet est
        devenu une billetterie à part entière : des centaines de salles, de
        théâtres et de stades partenaires, une réservation en quelques clics et
        une confirmation immédiate par e-mail. Notre conviction n'a pas changé
        depuis le premier jour : la culture et le sport sont plus forts quand
        ils sont accessibles à tous.
      </p>

      <h2>Notre mission</h2>
      <p>
        Rendre la sortie simple, transparente et sûre. Chaque place affichée
        est une place réellement disponible, chaque billet acheté est confirmé
        immédiatement, et notre équipe vous répond sept jours sur sept.
      </p>

      <h2>PlaceLibre en chiffres</h2>
      <ul className="stats">
        <li>
          <strong>250 000</strong>
          <span>spectateurs accompagnés chaque année</span>
        </li>
        <li>
          <strong>1 200</strong>
          <span>événements partenaires référencés</span>
        </li>
        <li>
          <strong>98 %</strong>
          <span>de clients satisfaits de leur réservation</span>
        </li>
        <li>
          <strong>7 j/7</strong>
          <span>une équipe support à votre écoute</span>
        </li>
      </ul>

      <h2>Nos engagements</h2>
      <ul>
        <li>des places réelles, mises à jour en temps réel ;</li>
        <li>
          une réservation fiable : jamais de doublon, jamais de mauvaise
          surprise à l'entrée ;
        </li>
        <li>un e-mail de confirmation immédiat après chaque achat ;</li>
        <li>
          des tarifs transparents, avec des réductions pour les jeunes, les
          familles et les demandeurs d'emploi.
        </li>
      </ul>

      <h2>Une équipe passionnée</h2>
      <p>
        Derrière PlaceLibre, une équipe de passionnés — producteurs, artistes,
        chargés de clientèle — réunie entre Lyon et Paris. Une question sur une
        réservation, un doute sur une date ?{" "}
        <Link to="/contact">Écrivez-nous</Link>, nous répondons vite.
      </p>

      <p>
        <Link className="btn" to="/evenements">
          Voir les événements
        </Link>
      </p>
    </article>
  );
}
