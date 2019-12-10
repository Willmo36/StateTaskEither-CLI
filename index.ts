import readline from "readline";
import * as STE from "fp-ts-contrib/lib/StateTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import * as Record from "fp-ts/lib/Record";
import { pipe } from "fp-ts/lib/pipeable";

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

function loop(questions: string[]): STE.StateTaskEither<Answers, never, string> {
  if (questions.length === 0) {
    return STE.stateTaskEither.of("Finished!");
  }

  const [q, ...rest] = questions;

  const handleAnswer = (answer: string) =>
    pipe(
      STE.get<Answers>(),
      STE.chain(state =>
        !!state[answer]
          ? loop(questions)
          : pipe(
              //modify returns void in the A slot
              //resulting in State<Answers, void>
              STE.modify<Answers>(Record.insertAt<string, boolean>(answer, true)),
              //so we chain back to the answer from earlier 
              //resulting in State<Answers, Answer>
              STE.chain(() => STE.stateTaskEither.of(answer))
            )
      ),
      STE.chain(() => loop(rest))
    );

  return pipe(question(q), STE.chain(handleAnswer));
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
