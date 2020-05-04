import * as vscode from 'vscode';

import { GitExtension } from '../../git';
import { Project } from '../../3d2p/Project';
import { ProjectUploader } from '../ProjectUploader';
import { BaseQuestionnaire } from '../promptEngine/BaseQuestionnaire';
import { PromptResult } from '../promptEngine/PromptResult';

export class UploadProjectQuestionnaire extends BaseQuestionnaire {
    private _projectUploader: ProjectUploader = new ProjectUploader();

    constructor(private _project: Project) { super(); }

    public async checkPrerequisite(): Promise<PromptResult> { 
        if(this._project.projectFile.coverImage === '') {
            return new PromptResult('Add a cover image!', true);
        }
        
        let gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
        if(gitExtension === undefined) {
            return new PromptResult('Git Extension was not found in VS Code!', true);
        }
        else {
            let git = gitExtension.getAPI(1);
            let repo = git.getRepository(vscode.Uri.file(this._project.projectPath));
            if(repo === null) {
                return new PromptResult('No repository found in current workspace!', true);
            }
            else if(repo.state.workingTreeChanges.filter(c => c.uri.fsPath.includes('3D2P.json')).length > 0)
            {
                return new PromptResult('Please push your 3D2P.json file!', true);
            }
        }
        return new PromptResult();
    }

    public async vscCommand(): Promise<PromptResult> {
        let shortId = await this._projectUploader.uploadProject(this._project.projectFile.repositoryUrl);                      
        return new PromptResult(`https://3d2p.net/Project/${shortId}`);
    }

    public get Name(): string {
        return "Upload Project";
    }
}