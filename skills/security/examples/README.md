```bash
npx hermes-security scan projects/construction-quotes
```

```ts
import { scanForSecrets } from "@hermes/security";

const findings = scanForSecrets(projectDir);
if (findings.length > 0) {
  // block the quality gate — see docs/security-model.md § 6 Failure handling
}
```
