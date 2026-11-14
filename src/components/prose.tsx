import { Fragment } from "react";
function inline(text: string) {
  return text
    .split(/(\[[^\]]+\]\((?:https?:\/\/|\/(?!\/))[^\s)]+\))/g)
    .map((part, i) => {
      const match = part.match(
        /^\[([^\]]+)\]\(((?:https?:\/\/|\/(?!\/))[^\s)]+)\)$/,
      );
      return match ? (
        <a
          key={i}
          href={match[2]}
          rel={match[2].startsWith("/") ? undefined : "noopener noreferrer"}
          target={match[2].startsWith("/") ? undefined : "_blank"}
        >
          {match[1]}
        </a>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      );
    });
}
export function Prose({ body }: { body: string }) {
  return (
    <div className="prose">
      {body.split("\n\n").map((p, i) =>
        p.split("\n").every((l) => /^[-*] /.test(l)) ? (
          <ul key={i}>
            {p.split("\n").map((l, j) => (
              <li key={j}>{inline(l.slice(2))}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(p)}</p>
        ),
      )}
    </div>
  );
}
