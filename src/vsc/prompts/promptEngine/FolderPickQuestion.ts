import * as vscode from 'vscode';

import { BaseQuestion } from './BaseQuestion';

export class FolderPickQuestion extends BaseQuestion {
    constructor(public question: string, dependendQuestion?: BaseQuestion, shouldShowDelegate?: (value: string) => boolean) { 
        super(dependendQuestion, shouldShowDelegate);
    }

    public async show(): Promise<void> {
        this._answer = await vscode.window
            .showInputBox({ prompt: this.question, placeHolder: 'Enter Path or leave this prompt empty to open a folder selection.' });
        if(this._answer === undefined || this._answer === '') {
            let selectedFolder = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true });
            if(selectedFolder !== undefined) {
                this._answer = (<vscode.Uri[]>selectedFolder)[0].fsPath;
            }
        }   
    }
}