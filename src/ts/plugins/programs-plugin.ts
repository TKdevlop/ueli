import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { SearchPlugin } from "./search-plugin";
import { SearchResultItem } from "../search-engine";
import { FileHelpers } from "../helpers/file-helpers";
import { Config } from "../config";

export class ProgramsPlugin implements SearchPlugin {
    private programs: Program[];

    constructor(programRepository?: ProgramRepository) {
        if (programRepository === undefined) {
            programRepository = Config.getProgramRepository();
        }

        this.programs = programRepository.getPrograms();
    }

    public getAllItems(): SearchResultItem[] {
        let result = [] as SearchResultItem[];

        for (let program of this.programs) {
            result.push(<SearchResultItem>{
                name: program.name,
                executionArgument: program.executionArgument,
                tags: []
            });
        }

        return result;
    }
}

export class Program {
    public name: string;
    public executionArgument: string;
}

export interface ProgramRepository {
    getPrograms(): Program[];
}

export class FakeProgramRepository implements ProgramRepository {
    private programs: Program[];

    constructor(programs: Program[]) {
        this.programs = programs;
    }

    public getPrograms(): Program[] {
        return this.programs;
    }
}

export class WindowsProgramRepository implements ProgramRepository {
    private programs: Program[];
    private folders = [
        "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs",
        `${process.env.USERPROFILE}\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs`
    ];
    private shortcutFileExtensions = [".lnk", ".appref-ms", ".url"];

    constructor() {
        this.programs = this.loadPrograms();
    }

    public getPrograms(): Program[] {
        return this.programs;
    }

    private loadPrograms(): Program[] {
        let result = [] as Program[];

        let files = FileHelpers.getFilesFromFoldersRecursively(this.folders);

        for (let file of files) {
            for (let shortcutFileExtension of this.shortcutFileExtensions) {
                if (file.endsWith(shortcutFileExtension)) {
                    result.push(<Program>{
                        executionArgument: file,
                        name: path.basename(file).replace(shortcutFileExtension, "")
                    });
                }
            }
        }

        return result;
    }
}

export class LinuxProgramRepository implements ProgramRepository {
    private folders = [
        "/usr/share/applications",
        `${os.homedir()}/.local/share/applications`
    ];

    public getPrograms(): Program[] {
        let result = [] as Program[];

        let files = FileHelpers.getFilesFromFoldersRecursively(this.folders);

        for (let file of files) {
            let fileContent = fs.readFileSync(file).toString('utf-8');
            let lines = fileContent.split('\n');
            let programNames = lines.filter((l) => { return l.startsWith("Name=")});
            let executionArguments = lines.filter((l) => { return l.startsWith("Exec=")});

            if (programNames.length === 0 || executionArguments.length === 0)
                continue;

            result.push(<Program> {
                name: programNames[0].replace("Name=", ""),
                executionArgument: executionArguments[0].replace("Exec=", "")
            });
        }

        return result;
    }
}