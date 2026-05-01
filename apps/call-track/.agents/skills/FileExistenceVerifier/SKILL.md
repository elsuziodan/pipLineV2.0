---
name: FileExistenceVerifier
description: Obliga al agente a verificar la existencia de un archivo antes de intentar cualquier operación de modificación o lectura profunda.
---

# FileExistenceVerifier

Esta skill previene errores de "archivo no encontrado" y pérdida de tiempo en bucles de reintento.

## Instrucciones de Uso:
1. **SIEMPRE** ejecuta un comando `ls` o usa `view_file` para confirmar que el archivo existe en la ruta especificada antes de usar herramientas de edición (`replace_file_content`, `multi_replace_file_content`, etc.).
2. Si el archivo no existe y tu objetivo es editarlo, detente e informa al usuario o créalo desde cero usando `write_to_file` SOLO si estás seguro de que esa es la intención.
3. Ante la duda de la ubicación de un archivo en una estructura compleja, usa `list_dir` recursivamente antes de asumir una ruta.

## Regla de Oro:
**No asumas, verifica.** Un archivo que no ves en el árbol de archivos actual NO existe hasta que un `ls` diga lo contrario.
