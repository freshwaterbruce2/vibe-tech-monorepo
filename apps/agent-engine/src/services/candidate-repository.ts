import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PATHS } from '../config.js';
import type { CandidateRevision } from '../types.js';

export class CandidateRepository {
  public constructor(private readonly root = PATHS.candidatesDir) {
    mkdirSync(this.root, { recursive: true });
  }

  public save(candidate: CandidateRevision): string {
    const path = join(this.root, `${candidate.id}.json`);
    writeFileSync(path, JSON.stringify(candidate, null, 2), 'utf-8');
    return path;
  }

  public update(
    candidateId: string,
    updater: (candidate: CandidateRevision) => CandidateRevision,
  ): CandidateRevision {
    const updated = updater(this.get(candidateId));
    this.save(updated);
    return updated;
  }

  public get(candidateId: string): CandidateRevision {
    return JSON.parse(
      readFileSync(join(this.root, `${candidateId}.json`), 'utf-8'),
    ) as CandidateRevision;
  }

  public list(): CandidateRevision[] {
    return readdirSync(this.root)
      .filter((name) => name.endsWith('.json'))
      .map((name) => JSON.parse(readFileSync(join(this.root, name), 'utf-8')) as CandidateRevision);
  }
}
