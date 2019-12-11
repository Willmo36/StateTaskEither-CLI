import readline from "readline";
import * as STE from "fp-ts-contrib/lib/StateTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import * as Record from "fp-ts/lib/Record";
import { Do } from "fp-ts-contrib/lib/Do";

const doSTE = Do(STE.stateTaskEitherSeq);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

type Fail = never;
type Answers = Record<string, boolean>;
type Answer = string;

const question = (q: string) =>
  STE.fromTaskEither<Answers, Fail, Answer>(
    TE.taskEither.fromTask<Fail, Answer>(
      () =>
        new Promise((res, rej) => {
          rl.question(q + ": ", answer => {
            rl.pause();
            res(answer);
          });
        })
    )
  );

const clear = STE.fromTaskEither<Answers, Fail, void>(
  TE.taskEither.fromIO(() => {
    console.clear();
  })
);

function loop(
  questions: string[]
): STE.StateTaskEither<Answers, never, string> {
  if (questions.length === 0) {
    return STE.stateTaskEither.of("Finished!");
  }

  const [q, ...rest] = questions;

  return doSTE
    .bindL("clear", () => clear)
    .bindL("answer", () => question(q))
    .bindL("state", () => STE.get<Answers>())
    .bindL("result", d =>
      !!d.state[d.answer]
        ? loop(questions)
        : doSTE
            .bind(
              "update",
              STE.modify<Answers>(
                Record.insertAt<string, boolean>(d.answer, true)
              )
            )
            .return(_ => d.answer)
    )
    .bindL("next", d => loop(rest))
    .bindL("clear2", ()=> clear)
    .return(d => d.next);
}

function main() {
  const questions = ["q1", "q2"];
  const ste = loop(questions);

  const exec = ste({})();
  exec.then(
    E.fold(
      err => {
        console.error(err);
      },
      state => {
        console.info(state);
      }
    )
  );
}

main();
