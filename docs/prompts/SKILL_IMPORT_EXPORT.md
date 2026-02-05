# SKILL_IMPORT_EXPORT.md

## Goal
Add the ability to import skills from ZIP files and export existing skills as ZIP files. This enables skill portability and sharing.

---

## Current State
- `Create Skill` creates an empty skill folder with template SKILL.md
- `repos.skills.exportZip()` exists but may not be fully implemented
- No import/upload functionality exists
- Skills page has "Find Skills" (links to GitHub) and "Create Skill" buttons

---

## Tasks

### 1. Upload/Import Skill from ZIP

#### UI Changes (`skills-client.tsx`)
Add "Upload Skill" button between "Find Skills" and "Create Skill":

```tsx
<label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-bg-2 text-fg-1 hover:bg-bg-3 border border-bd-0 rounded-[var(--radius-md)] cursor-pointer">
  <Upload className="w-3.5 h-3.5" />
  Upload Skill
  <input
    type="file"
    accept=".zip"
    className="hidden"
    onChange={handleUpload}
  />
</label>
```

#### Upload Flow
1. User clicks "Upload Skill" → file picker opens
2. User selects `.zip` file
3. Show upload modal with:
   - File name
   - Scope selector (Global / Agent)
   - Agent selector (if agent scope)
   - "Install" button
4. On submit → POST to `/api/skills/import`
5. Show success/error toast
6. Refresh skills list

#### API Endpoint: `POST /api/skills/import`

```typescript
// apps/clawcontrol/app/api/skills/import/route.ts

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const scope = formData.get('scope') as 'global' | 'agent'
  const agentId = formData.get('agentId') as string | null
  const typedConfirmText = formData.get('typedConfirmText') as string

  // Validate file
  if (!file || !file.name.endsWith('.zip')) {
    return NextResponse.json({ error: 'ZIP file required' }, { status: 400 })
  }

  // Enforce Governor (skill.install is danger level)
  const result = await enforceTypedConfirm({
    actionKind: 'skill.install',
    typedConfirmText,
  })
  if (!result.allowed) {
    return NextResponse.json({ error: result.errorType }, { status: 403 })
  }

  // Process ZIP
  const repos = getRepos()
  const skill = await repos.skills.importZip(file, { scope, agentId })

  return NextResponse.json({ data: skill }, { status: 201 })
}
```

#### Repository Method: `importZip()`

```typescript
// In apps/clawcontrol/lib/repo/skills.ts

async importZip(
  file: File,
  options: { scope: SkillScope; agentId?: string }
): Promise<SkillDTO> {
  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)

  // 1. Validate: must have SKILL.md at root
  const skillMdFile = zip.file('SKILL.md') || zip.file(/^[^/]+\/SKILL\.md$/)?.[0]
  if (!skillMdFile) {
    throw new Error('Invalid skill: SKILL.md not found at root')
  }

  // 2. Determine skill name from folder or SKILL.md
  const skillMd = await skillMdFile.async('string')
  const nameMatch = skillMd.match(/^#\s+(.+)$/m)
  const folderName = file.name.replace('.zip', '')
  const skillName = nameMatch?.[1]?.toLowerCase().replace(/\s+/g, '-') || folderName

  // 3. Validate skill name
  const safeNameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
  if (!safeNameRegex.test(skillName)) {
    throw new Error('Invalid skill name derived from ZIP')
  }

  // 4. Check for existing skill
  const existing = await this.getByName(options.scope, skillName, options.agentId)
  if (existing) {
    throw new Error(`Skill "${skillName}" already exists`)
  }

  // 5. Determine target directory
  const targetDir = options.scope === 'global'
    ? `/skills/${skillName}`
    : `/agents/${options.agentId}/skills/${skillName}`

  // 6. Extract all files to target
  await fsp.mkdir(join(getWorkspaceRoot(), targetDir), { recursive: true })
  
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue
    
    // Handle nested folder structure (skill might be in a subfolder)
    const relativePath = path.includes('/') 
      ? path.substring(path.indexOf('/') + 1)
      : path
    
    if (!relativePath) continue
    
    const content = await zipEntry.async('nodebuffer')
    const targetPath = join(getWorkspaceRoot(), targetDir, relativePath)
    
    await fsp.mkdir(dirname(targetPath), { recursive: true })
    await fsp.writeFile(targetPath, content)
  }

  // 7. Return skill DTO
  return this.getByName(options.scope, skillName, options.agentId)!
}
```

#### Dependencies
Add to `apps/clawcontrol/package.json`:
```json
{
  "dependencies": {
    "jszip": "^3.10.1"
  }
}
```

---

### 2. Export Skill as ZIP

#### UI Changes
Add "Export" button in skill drawer/detail view:

```tsx
<button
  onClick={() => handleExport(skill)}
  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm"
>
  <Download className="w-3.5 h-3.5" />
  Export
</button>
```

#### Export Flow
1. User clicks "Export" on a skill
2. `GET /api/skills/{scope}/{id}/export` returns ZIP blob
3. Browser downloads `{skill-name}.zip`

#### API Endpoint: `GET /api/skills/[scope]/[id]/export/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { scope: string; id: string } }
) {
  const { scope, id } = params
  
  const repos = getRepos()
  const zipBlob = await repos.skills.exportZip(scope as SkillScope, id)
  
  if (!zipBlob) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  const skill = await repos.skills.getById(scope as SkillScope, id)
  const filename = `${skill?.name || 'skill'}.zip`

  return new NextResponse(zipBlob, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

#### Repository Method: `exportZip()` (verify/complete)

```typescript
async exportZip(scope: SkillScope, id: string): Promise<Blob | null> {
  const skill = await this.getById(scope, id)
  if (!skill) return null

  const skillDir = scope === 'global'
    ? `/skills/${skill.name}`
    : `/agents/${skill.agentId}/skills/${skill.name}`

  const zip = new JSZip()
  const fullPath = join(getWorkspaceRoot(), skillDir)

  // Recursively add all files
  async function addDirectory(dirPath: string, zipFolder: JSZip) {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const entryPath = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        const subFolder = zipFolder.folder(entry.name)!
        await addDirectory(entryPath, subFolder)
      } else {
        const content = await fsp.readFile(entryPath)
        zipFolder.file(entry.name, content)
      }
    }
  }

  await addDirectory(fullPath, zip)
  return zip.generateAsync({ type: 'blob' })
}
```

---

### 3. Upload Modal Component

```tsx
// apps/clawcontrol/app/(dashboard)/skills/components/upload-skill-modal.tsx

interface UploadSkillModalProps {
  isOpen: boolean
  onClose: () => void
  onUploaded: () => void
  agents: AgentDTO[]
  protectedAction: ProtectedActionHook
}

function UploadSkillModal({ isOpen, onClose, onUploaded, agents, protectedAction }: UploadSkillModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [scope, setScope] = useState<'global' | 'agent'>('global')
  const [agentId, setAgentId] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected && selected.name.endsWith('.zip')) {
      setFile(selected)
      setError(null)
    } else {
      setError('Please select a .zip file')
    }
  }

  const handleSubmit = async () => {
    if (!file) return

    protectedAction.trigger({
      actionKind: 'skill.install',
      actionTitle: 'Upload Skill',
      actionDescription: `Install skill from ${file.name}`,
      onConfirm: async (typedConfirmText) => {
        setIsUploading(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('scope', scope)
        if (scope === 'agent') formData.append('agentId', agentId)
        formData.append('typedConfirmText', typedConfirmText)

        try {
          const res = await fetch('/api/skills/import', {
            method: 'POST',
            body: formData,
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || 'Upload failed')
          }
          onUploaded()
          onClose()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Upload failed')
        } finally {
          setIsUploading(false)
        }
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>Upload Skill</ModalHeader>
      <ModalBody>
        {/* Drop zone or file input */}
        <div className="border-2 border-dashed border-bd-1 rounded-lg p-8 text-center">
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FileArchive className="w-6 h-6" />
              <span>{file.name}</span>
              <button onClick={() => setFile(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-fg-3" />
              <p>Click to select or drag & drop a .zip file</p>
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>

        {/* Scope selector */}
        <div className="mt-4">
          <label className="text-sm text-fg-2">Scope</label>
          <select value={scope} onChange={(e) => setScope(e.target.value as any)}>
            <option value="global">Global</option>
            <option value="agent">Agent-specific</option>
          </select>
        </div>

        {/* Agent selector (conditional) */}
        {scope === 'agent' && (
          <div className="mt-4">
            <label className="text-sm text-fg-2">Agent</label>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">Select agent...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-status-error mt-2">{error}</p>}
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose}>Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!file || isUploading || (scope === 'agent' && !agentId)}
        >
          {isUploading ? 'Installing...' : 'Install Skill'}
        </button>
      </ModalFooter>
    </Modal>
  )
}
```

---

## Files to Create/Modify

```
apps/clawcontrol/
├── app/(dashboard)/skills/
│   ├── skills-client.tsx              # Add Upload button + modal
│   └── components/
│       └── upload-skill-modal.tsx     # NEW
├── app/api/skills/
│   ├── import/
│   │   └── route.ts                   # NEW - POST import ZIP
│   └── [scope]/[id]/
│       └── export/
│           └── route.ts               # NEW - GET export ZIP
├── lib/repo/
│   └── skills.ts                      # Add/complete importZip, exportZip
└── package.json                       # Add jszip dependency
```

---

## Acceptance Criteria

- [ ] "Upload Skill" button appears on Skills page (between Find Skills and Create Skill)
- [ ] Clicking opens modal with file drop zone
- [ ] ZIP validation: must contain SKILL.md
- [ ] Scope selection (global/agent) works
- [ ] Governor confirmation required for install
- [ ] Skill appears in list after successful upload
- [ ] "Export" button appears in skill detail/drawer
- [ ] Export downloads a valid ZIP containing all skill files
- [ ] Exported ZIP can be re-imported successfully
- [ ] Error handling for invalid ZIPs, duplicate names, etc.

---

## Edge Cases to Handle

1. **Nested ZIP structure** — skill might be in a subfolder (e.g., `skill-name/SKILL.md`)
2. **Name conflicts** — skill with same name exists
3. **Invalid characters** — skill name from ZIP has unsafe characters
4. **Large files** — set reasonable size limit (e.g., 10MB)
5. **Missing SKILL.md** — clear error message
6. **Binary files** — handle images, scripts correctly
