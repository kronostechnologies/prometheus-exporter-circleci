Simply use `{{repo}}` as `Legend format` to display the repository's name as the series' label.

### Average workflow build time per repository
At the moment, this is an approximate value since it's not directly available through the API. We try to detect concurrent jobs using `upstream_jobs`.

`avg(sum(max(circleci_build_time_sum) by (repo,workflow,upstream_jobs)) by (repo,workflow)) by (repo)`

### Workflow builds count per repo
`count(sum(circleci_build_time_count) by (repo, workflow)) by (repo)`

### Jobs count per repo
`sum(circleci_build_time_count) by (repo)`

### Workflow failures count per repo
`count(sum(circleci_build_time_count{success="false"}) by (repo, workflow)) by (repo)`

### Workflow failures count on master or develop per repo
`count(sum(circleci_build_time_count{branch=~"master|develop",success="false"}) by (repo, workflow)) by (repo)`
