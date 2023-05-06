import Docker from "dockerode"

export class DockerExt extends Docker {
    public async imageExists(imageName: string): Promise<boolean> {
        try {
            await this.getImage(imageName).inspect()
            return true
        } catch {
            return false
        }
    }
}

export const docker = new DockerExt()
