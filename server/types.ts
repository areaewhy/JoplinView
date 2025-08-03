export interface NoteData {
  joplinId: string;
  title: string;
  body: string;
  author: string | null;
  source: string | null;
  latitude: string | null;
  longitude: string | null;
  altitude: string | null;
  completed: boolean | null;
  due: Date | null;
  createdTime: Date | null;
  updatedTime: Date | null;
  s3Key: string;
  tags: string[];
  size: number | undefined;
}
