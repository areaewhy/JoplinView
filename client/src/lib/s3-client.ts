import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

export interface S3Config {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class JoplinS3Client {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(config: S3Config) {
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucketName = config.bucketName;
  }

  async listMarkdownFiles(): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Contents) {
        return [];
      }

      return response.Contents
        .filter(obj => obj.Key && obj.Key.endsWith('.md'))
        .map(obj => obj.Key!)
        .filter(key => key.length > 0);
    } catch (error) {
      console.error("Error listing S3 objects:", error);
      throw new Error("Failed to list files from S3");
    }
  }

  async getFileContent(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error("No content found");
      }

      const content = await response.Body.transformToString();
      return content;
    } catch (error) {
      console.error(`Error getting file ${key}:`, error);
      throw new Error(`Failed to get file content: ${key}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        MaxKeys: 1,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error("S3 connection test failed:", error);
      return false;
    }
  }
}
