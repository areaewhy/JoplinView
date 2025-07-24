import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cloud, Save, Wifi, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertS3ConfigSchema, type InsertS3Config, type SyncStatus } from "@shared/schema";

interface SettingsPanelProps {
  syncStatus?: SyncStatus;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function SettingsPanel({ syncStatus, selectedTags, onTagsChange }: SettingsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertS3Config>({
    resolver: zodResolver(insertS3ConfigSchema),
    defaultValues: {
      bucketName: "",
      region: "us-east-1",
      endpoint: "",
      accessKeyId: "",
      secretAccessKey: "",
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["/api/tags"],
  });

  const { data: s3Config } = useQuery({
    queryKey: ["/api/s3-config"],
    retry: false,
  });

  // Update form when s3Config is loaded
  if (s3Config && !form.getValues().bucketName) {
    form.reset({
      bucketName: s3Config.bucketName || "",
      region: s3Config.region || "",
      endpoint: s3Config.endpoint || "",
      accessKeyId: s3Config.accessKeyId || "",
      secretAccessKey: "", // Don't prefill password
    });
  }

  const testConnectionMutation = useMutation({
    mutationFn: async (data: InsertS3Config) => {
      const response = await apiRequest("POST", "/api/s3-config/test", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "S3 connection test successful!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to S3",
        variant: "destructive",
      });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: InsertS3Config) => {
      const response = await apiRequest("POST", "/api/s3-config", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "S3 configuration saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/s3-config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save S3 configuration",
        variant: "destructive",
      });
    },
  });

  const syncNotesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/notes/sync", {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${data.notesCount} notes`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync notes from S3",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertS3Config) => {
    saveConfigMutation.mutate(data);
  };

  const handleTestConnection = () => {
    const formData = form.getValues();
    if (!formData.bucketName || !formData.accessKeyId || !formData.secretAccessKey || !formData.region) {
      toast({
        title: "Missing Information",
        description: "Please fill in bucket name, region, access key, and secret key",
        variant: "destructive",
      });
      return;
    }
    testConnectionMutation.mutate(formData);
  };

  const handleTagToggle = (tagName: string, checked: boolean) => {
    if (checked) {
      onTagsChange([...selectedTags, tagName]);
    } else {
      onTagsChange(selectedTags.filter(tag => tag !== tagName));
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Cloud className="text-primary mr-2 h-5 w-5" />
          S3 Configuration
        </h2>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="bucketName">Bucket Name</Label>
            <Input
              id="bucketName"
              placeholder="my-joplin-bucket"
              {...form.register("bucketName")}
              className="mt-1"
            />
            {form.formState.errors.bucketName && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.bucketName.message}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="region">S3 Region</Label>
            <Input
              id="region"
              placeholder="us-east-005 or your custom region"
              {...form.register("region")}
              className="mt-1"
            />
            {form.formState.errors.region && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.region.message}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="endpoint">S3 Endpoint URL (Optional)</Label>
            <Input
              id="endpoint"
              placeholder="https://s3.your-provider.com (leave empty for AWS S3)"
              {...form.register("endpoint")}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              For S3-compatible services like MinIO, DigitalOcean Spaces, etc.
            </p>
            {form.formState.errors.endpoint && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.endpoint.message}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="accessKeyId">Access Key ID</Label>
            <Input
              id="accessKeyId"
              placeholder="AKIAIOSFODNN7EXAMPLE"
              {...form.register("accessKeyId")}
              className="mt-1"
            />
            {form.formState.errors.accessKeyId && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.accessKeyId.message}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="secretAccessKey">Secret Access Key</Label>
            <Input
              id="secretAccessKey"
              type="password"
              placeholder="••••••••••••••••••••"
              {...form.register("secretAccessKey")}
              className="mt-1"
            />
            {form.formState.errors.secretAccessKey && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.secretAccessKey.message}
              </p>
            )}
          </div>
          
          <div className="flex space-x-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending}
              className="flex-1"
            >
              <Wifi className="mr-2 h-4 w-4" />
              {testConnectionMutation.isPending ? "Testing..." : "Test"}
            </Button>
            <Button 
              type="submit" 
              disabled={saveConfigMutation.isPending}
              className="flex-1"
            >
              <Save className="mr-2 h-4 w-4" />
              {saveConfigMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>

      {/* Sync Stats */}
      <div className="mb-6 p-4 bg-muted rounded-lg">
        <h3 className="text-sm font-semibold text-foreground mb-3">Sync Statistics</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Notes:</span>
            <span className="font-medium">{syncStatus?.totalNotes || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Sync:</span>
            <span className="font-medium">
              {syncStatus?.lastSyncTime 
                ? new Date(syncStatus.lastSyncTime).toLocaleString()
                : "Never"
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Storage Used:</span>
            <span className="font-medium">{syncStatus?.storageUsed || "0 MB"}</span>
          </div>
        </div>
        <Button 
          onClick={() => syncNotesMutation.mutate()}
          disabled={syncNotesMutation.isPending}
          className="w-full mt-3"
          variant="default"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${syncNotesMutation.isPending ? "animate-spin" : ""}`} />
          {syncNotesMutation.isPending ? "Syncing..." : "Refresh Notes"}
        </Button>
      </div>

      {/* Tags Filter */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Filter by Tags</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {Array.isArray(tags) && tags.map((tag: { name: string; count: number }) => (
            <label 
              key={tag.name}
              className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-muted p-1 rounded"
            >
              <Checkbox
                checked={selectedTags.includes(tag.name)}
                onCheckedChange={(checked) => handleTagToggle(tag.name, checked as boolean)}
              />
              <span className="text-muted-foreground">{tag.name}</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto">
                {tag.count}
              </span>
            </label>
          ))}
          {(!Array.isArray(tags) || tags.length === 0) && (
            <p className="text-sm text-muted-foreground italic">No tags found. Sync notes to see tags.</p>
          )}
        </div>
      </div>
    </div>
  );
}
