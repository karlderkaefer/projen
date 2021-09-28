import { Component } from './component';
import { Project } from './project';
import { YamlFile } from './yaml';

export interface CircleCiProps {
  readonly orbs?: Record<string, IOrb>;
  readonly description?: string;
  readonly jobs?: string[];
  readonly version: string;
  readonly workflows?: Record<string, IWorkflow>[];
}

export interface IOrb {
  readonly name: string;
  readonly version: string;
  toString(): string;
}

export class Orb implements IOrb {
  readonly name: string;
  readonly version: string;

  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
  }
  public toString(): string {
    return `${this.name}@${this.version}`;
  }
}

export interface IJob {
  readonly requires: string[];
  readonly context: string[];
  readonly filterBranchOnly: string[];
}

export interface IWorkflow {
  readonly jobs: Record<string, IJob[]>[];
}

function renderCircleCiFile(props?: CircleCiProps): object {
  const orbs : Record<string, string> = {};
  for (const [id, orb] of Object.entries(props?.orbs ?? {})) {
    orbs[id] = `${orb.toString()}`;
  }
  return {
    version: props?.version || '2.1',
    description: props?.description,
    orbs: orbs,
    jobs: props?.jobs,
    workflows: props?.workflows,
  };
}

export class CircleCi extends Component {
  constructor(project: Project, props?: CircleCiProps) {
    super(project);
    new YamlFile(project, 'circle.yml', {
      committed: true,
      readonly: true,
      obj: () => this._synthesizeCircleCi(props),
    });
  }
  _synthesizeCircleCi(props?: CircleCiProps): object {
    return renderCircleCiFile(props);
  }
}

