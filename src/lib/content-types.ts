/** The six content types and the form each one asks for. The wizard renders entirely from this table. */

export type ContentTypeId = "music" | "film" | "artwork" | "podcast" | "content" | "custom";

/** Order matches the IPKind enum in IP4PSRegistry.sol. */
export const KIND_ORDER: ContentTypeId[] = ["music", "film", "artwork", "podcast", "content", "custom"];
export const kindIndex = (id: ContentTypeId) => KIND_ORDER.indexOf(id);
export const kindFromIndex = (i: number): ContentTypeId => KIND_ORDER[i] ?? "custom";

export type FieldType = "text" | "date" | "number" | "duration" | "textarea" | "select" | "url" | "dimensions";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  /** Used as the work's display creator (artist, director, host…). */
  creator?: boolean;
}

export interface FileSlot {
  key: string;
  label: string;
  accept: string;
  required?: boolean;
  multiple?: boolean;
  hint?: string;
  /** Image used as the token preview when stored publicly. */
  preview?: boolean;
}

/** A repeated sub-item: album tracks or series episodes. Each item carries its own file. */
export interface CollectionDef {
  key: "tracks" | "episodes";
  itemLabel: string;
  fields: FieldDef[];
  file: FileSlot;
}

export interface SubtypeDef {
  id: string;
  label: string;
  hint: string;
}

export interface ContentTypeDef {
  id: ContentTypeId;
  label: string;
  emoji: string;
  tagline: string;
  examples: string;
  subtypes: SubtypeDef[];
  fields: (subtype: string) => FieldDef[];
  files: (subtype: string) => FileSlot[];
  collection?: (subtype: string) => CollectionDef | undefined;
  /** Preset credit roles (film), or free-form collaborators when empty. */
  creditRoles?: string[];
  advanced?: boolean;
}

const AUDIO = ".mp3,.wav,.flac,.aac,.ogg,.m4a,audio/*";
const VIDEO = ".mp4,.mov,.avi,.mkv,.webm,video/*";
const IMAGE = ".jpg,.jpeg,.png,.gif,.svg,.webp,image/*";
const DOC = ".pdf,.txt,.docx,.md";
const DESIGN = ".psd,.ai,.sketch,.fig,.xd,.afdesign,.kra,.procreate";

const releaseDate: FieldDef = { key: "releaseDate", label: "Release date", type: "date" };
const creationDate: FieldDef = { key: "creationDate", label: "Creation date", type: "date" };

export const CONTENT_TYPES: ContentTypeDef[] = [
  {
    id: "music",
    label: "Music",
    emoji: "🎵",
    tagline: "Protect your musical creations",
    examples: "Single · Album",
    subtypes: [
      { id: "single", label: "Single track", hint: "One song with its lyrics and artwork" },
      { id: "album", label: "Full album", hint: "Every track fingerprinted under one record" },
    ],
    fields: (s) => [
      { key: "title", label: s === "album" ? "Album title" : "Track title", type: "text", required: true },
      { key: "artist", label: "Artist name", type: "text", required: true, creator: true },
      { key: "genre", label: "Genre", type: "text" },
      ...(s === "single" ? [{ key: "duration", label: "Duration", type: "duration" as const }] : []),
      releaseDate,
    ],
    files: (s) =>
      s === "album"
        ? [{ key: "cover", label: "Album artwork", accept: IMAGE, hint: "Recommended 3000×3000 px, JPG/PNG", preview: true }]
        : [
            { key: "audio", label: "Audio file", accept: AUDIO, required: true, hint: "MP3, WAV, FLAC, AAC, OGG" },
            { key: "lyrics", label: "Lyrics", accept: DOC, hint: "Optional — TXT or PDF" },
            { key: "cover", label: "Cover art", accept: IMAGE, hint: "Optional — JPG or PNG", preview: true },
          ],
    collection: (s) =>
      s === "album"
        ? {
            key: "tracks",
            itemLabel: "Track",
            fields: [
              { key: "title", label: "Title", type: "text", required: true },
              { key: "duration", label: "Duration", type: "duration" },
              { key: "collaborators", label: "Collaborators", type: "text", placeholder: "e.g. DJ Vibe Master" },
            ],
            file: { key: "audio", label: "Audio", accept: AUDIO, required: true },
          }
        : undefined,
  },
  {
    id: "film",
    label: "Film",
    emoji: "🎬",
    tagline: "Protect your video content",
    examples: "Short · Feature",
    subtypes: [
      { id: "short", label: "Short film", hint: "Under 40 minutes" },
      { id: "feature", label: "Feature film", hint: "40 minutes or longer" },
    ],
    fields: () => [
      { key: "title", label: "Film title", type: "text", required: true },
      { key: "director", label: "Director", type: "text", required: true, creator: true },
      { key: "duration", label: "Duration", type: "duration" },
      { key: "genre", label: "Genre", type: "text" },
      releaseDate,
    ],
    files: () => [
      { key: "video", label: "Video file", accept: VIDEO, required: true, hint: "MP4, MOV, AVI, MKV — large files are fingerprinted on your device" },
      { key: "script", label: "Script", accept: DOC, hint: "Optional — PDF or TXT" },
      { key: "poster", label: "Poster image", accept: IMAGE, hint: "JPG or PNG", preview: true },
    ],
    creditRoles: ["Producer", "Writer", "Cinematographer", "Editor", "Composer", "Lead actor"],
  },
  {
    id: "artwork",
    label: "Artwork",
    emoji: "🎨",
    tagline: "Protect digital art and designs",
    examples: "Digital art · NFT art",
    subtypes: [
      { id: "digital", label: "Digital art", hint: "Illustration, painting, 3D, photography" },
      { id: "nft", label: "NFT art", hint: "A piece made for on-chain collecting" },
    ],
    fields: () => [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "artist", label: "Artist", type: "text", required: true, creator: true },
      { key: "medium", label: "Medium", type: "text", placeholder: "e.g. Digital painting, Procreate" },
      { key: "dimensions", label: "Dimensions (px)", type: "dimensions" },
      creationDate,
      { key: "collection", label: "Series / collection", type: "text", placeholder: "Leave empty for a standalone piece" },
    ],
    files: () => [
      { key: "image", label: "Artwork", accept: IMAGE, required: true, hint: "JPG, PNG, GIF, SVG, WEBP — up to 500 MB", preview: true },
      { key: "source", label: "Source files", accept: DESIGN + ",.zip", multiple: true, hint: "Optional — PSD, AI, Sketch…" },
    ],
  },
  {
    id: "podcast",
    label: "Podcast",
    emoji: "🎙️",
    tagline: "Protect episodes and whole series",
    examples: "Episode · Series",
    subtypes: [
      { id: "episode", label: "Single episode", hint: "One episode with show notes" },
      { id: "series", label: "Full series", hint: "Several episodes under one record" },
    ],
    fields: (s) => [
      { key: "title", label: s === "series" ? "Podcast / season name" : "Episode title", type: "text", required: true },
      ...(s === "episode" ? [{ key: "podcastName", label: "Podcast name", type: "text" as const }] : []),
      { key: "hosts", label: "Host(s)", type: "text", required: true, creator: true },
      { key: "category", label: "Category", type: "text" },
      ...(s === "episode"
        ? [
            { key: "episodeNumber", label: "Episode #", type: "number" as const },
            { key: "seasonNumber", label: "Season #", type: "number" as const },
            { key: "duration", label: "Duration", type: "duration" as const },
          ]
        : [{ key: "seasonNumber", label: "Season #", type: "number" as const }]),
      releaseDate,
      { key: "description", label: "Description", type: "textarea" },
    ],
    files: (s) => [
      ...(s === "episode" ? [{ key: "audio", label: "Audio file", accept: AUDIO, required: true, hint: "MP3 or WAV" }] : []),
      { key: "notes", label: "Show notes", accept: DOC, hint: "Optional — TXT or PDF" },
      { key: "cover", label: "Cover art", accept: IMAGE, hint: "JPG or PNG", preview: true },
    ],
    collection: (s) =>
      s === "series"
        ? {
            key: "episodes",
            itemLabel: "Episode",
            fields: [
              { key: "title", label: "Episode title", type: "text", required: true },
              { key: "episodeNumber", label: "Episode #", type: "number" },
              { key: "duration", label: "Duration", type: "duration" },
            ],
            file: { key: "audio", label: "Audio", accept: AUDIO, required: true },
          }
        : undefined,
  },
  {
    id: "content",
    label: "Content",
    emoji: "📱",
    tagline: "Videos, articles, courses and more",
    examples: "Creator · Multi-type",
    subtypes: [
      { id: "youtube", label: "YouTube video", hint: "" },
      { id: "article", label: "Blog post / article", hint: "" },
      { id: "photography", label: "Photography series", hint: "" },
      { id: "course", label: "Educational course", hint: "" },
      { id: "product", label: "Digital product", hint: "" },
      { id: "other", label: "Other", hint: "" },
    ],
    fields: () => [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "creator", label: "Creator", type: "text", required: true, creator: true },
      { key: "platform", label: "Platform", type: "text", placeholder: "e.g. YouTube, Substack, Gumroad" },
      { key: "url", label: "URL", type: "url", placeholder: "https://…" },
      creationDate,
    ],
    files: () => [
      { key: "primary", label: "Primary content file", accept: "*", required: true, hint: "Any file type — video, image, document…" },
      { key: "supporting", label: "Supporting files", accept: "*", multiple: true, hint: "Optional" },
    ],
  },
  {
    id: "custom",
    label: "Custom",
    emoji: "⚙️",
    tagline: "Anything else — advanced mode",
    examples: "Anything else",
    subtypes: [{ id: "custom", label: "Custom IP", hint: "Brands, code, designs, inventions, manuscripts…" }],
    fields: () => [
      { key: "title", label: "IP title", type: "text", required: true },
      { key: "creator", label: "Creator", type: "text", required: true, creator: true },
      { key: "ipType", label: "Type", type: "text", placeholder: "e.g. Logo, Manuscript, Source code" },
      { key: "category", label: "Category", type: "text" },
      creationDate,
      { key: "description", label: "Describe your intellectual property", type: "textarea" },
    ],
    files: () => [{ key: "files", label: "Files", accept: "*", multiple: true, hint: "Drop as many files as you need" }],
    advanced: true,
  },
];

export const contentType = (id: ContentTypeId) => CONTENT_TYPES.find((t) => t.id === id)!;

export const MAX_FILE_BYTES = 500 * 1024 * 1024;
export const MAX_FILES_PER_RECORD = 64; // mirrors IP4PSRegistry.MAX_FILES
