import { createUploadthing, type FileRouter } from "uploadthing/next";
import { requireWorkspace } from "@/core/auth/require-workspace";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const result = await requireWorkspace();
      if (!result.ok) throw new Error("Unauthorized");
      return { userId: result.ctx.userId, workspaceId: result.ctx.workspaceId };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl || file.url };
    }),
  taskAttachment: f({
    image: { maxFileSize: "8MB", maxFileCount: 5 },
    pdf:   { maxFileSize: "16MB", maxFileCount: 5 },
    "application/msword":                                               { maxFileSize: "8MB", maxFileCount: 3 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "8MB", maxFileCount: 3 },
  })
    .middleware(async () => {
      const result = await requireWorkspace();
      if (!result.ok) throw new Error("Unauthorized");
      return { userId: result.ctx.userId, workspaceId: result.ctx.workspaceId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl || file.url, userId: metadata.userId };
    }),
  chatAttachment: f({
    image:  { maxFileSize: "8MB",  maxFileCount: 1 },
    pdf:    { maxFileSize: "16MB", maxFileCount: 1 },
    video:  { maxFileSize: "64MB", maxFileCount: 1 },
    "application/zip": { maxFileSize: "32MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const result = await requireWorkspace();
      if (!result.ok) throw new Error("Unauthorized");
      return { userId: result.ctx.userId, workspaceId: result.ctx.workspaceId };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl || file.url, name: file.name, type: file.type };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
