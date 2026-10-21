# ODD task documents

Feature and task documents for Organic Driven Development live here and are **versioned**.

They are the specification a delegated worker reads before touching code, and the record of what was
verified, so a reviewer can audit a branch against its stated scope.

Do not add `odd/` to `.git/info/exclude` or `.gitignore`: a local-only exclude hides new task documents
from `git add` and from review, which is how they silently disappear from the history.
