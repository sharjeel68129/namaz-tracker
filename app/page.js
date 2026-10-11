import Link from "next/link";
import Chart from "./app/chart";
import TopBar from "./top-bar";

// A made-up month to show what the chart looks like once it fills in.
const SAMPLE = [5, 5, 4, 5, 3, 5, 5, 4, 2, 5, 5, 5, 4, 5, 1, 3, 5, 5, 4, 5, 5, 0, 4, 5, 5, 5, 3, 5, 5, 4];
const sampleCells = SAMPLE.map((level, i) => ({ day: `2026-09-${String(i + 1).padStart(2, "0")}`, level }));

export default function Landing() {
  return (
    <>
    <TopBar />
    <div className="landing">
      <main>
        <section className="hero">
          <div className="hero-copy">
            <h1>
              Five prayers a day.
              <br />
              Always know where you stand.
            </h1>
            <p>
              Mark each prayer as prayed or missed, and Namaz Tracker keeps the count of every Qaza you still owe
              until you have made it up.
            </p>
            <Link className="button" href="/auth">
              Sign up or log in
            </Link>
          </div>
          <div className="hero-chart">
            <h2>Sep 26&apos;</h2>
            <Chart cells={sampleCells} />
          </div>
        </section>

        <section className="pitch">
          <div>
            <h2>Log a prayer in one tap.</h2>
            <p>Press Prayed or Missed. You have until the end of the next day to log each one.</p>
          </div>
          <div>
            <h2>See exactly what you owe.</h2>
            <p>Each prayer has its own Qaza count. It grows when you miss one and shrinks when you make one up.</p>
          </div>
          <div>
            <h2>Watch your month fill in.</h2>
            <p>One square per day, coloured by how many of the five you prayed on time.</p>
          </div>
        </section>
      </main>
    </div>
    </>
  );
}
