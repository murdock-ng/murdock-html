/*
 * Copyright (C) 2021 Inria
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Author: Alexandre Abadie <alexandre.abadie@inria.fr>
 */

import { useCallback, useEffect, useState } from 'react';
import Websocket from 'react-websocket';
import axios from 'axios';

import { JobItem } from './JobItem';
import { LoadingSpinner, ShowMore } from './components';
import { itemsDisplayedStep, murdockHttpBaseUrl, murdockWsUrl, cardColor } from './constants';

const JobsTableSmall = (props) => {
    return (
        <JobsTable small={true} {...props} />
    )

}

const JobsTable = (props) => {
    return (
        <table className="table table-sm table-striped table-hover">
            <thead>
            <tr>
                <th scope="col" className="text-left">Job</th>
                <th scope="col" className="text-left">Title</th>
                <th scope="col" className="text-left">Date</th>
                {(!props.small) && <th scope="col" className="text-center px-0">Duration</th>}
                <th scope="col" className="text-center">State</th>
            </tr>
            </thead>
            <tbody>
                {props.jobs.map(job => <JobItem key={job.uid} job={job} user={props.user} small={props.small} permissions={props.permissions} notify={props.notify}/>)}
            </tbody>
        </table>
    )
}

const JobSearch = (props) => {
    return (
        <div className="btn-toolbar justify-content-left my-1" role="toolbar">
            <div className="btn-group m-1" role="group">
                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkAll" onChange={props.isAllClicked} checked={props.jobType === "all"} />
                <label className="btn btn-outline-primary" htmlFor="checkAll">All</label>
                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkPRs" onChange={props.isPRClicked} checked={props.jobType === "pr"} />
                <label className="btn btn-outline-primary" htmlFor="checkPRs">PRs</label>
                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkBranches" onChange={props.isBranchClicked} checked={props.jobType === "branch"} />
                <label className="btn btn-outline-primary" htmlFor="checkBranches">Branches</label>
                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkTags" onChange={props.isTagClicked} checked={props.jobType === "tag"} />
                <label className="btn btn-outline-primary" htmlFor="checkTags">Tags</label>
            </div>
            <div className="btn-group m-1" role="group">
                <input type="checkbox" className="btn-check" id="checkQueued" onChange={props.showQueuedClicked} checked={props.jobStates.includes("queued")} />
                <label className={`btn btn-outline-${cardColor["queued"]}`} htmlFor="checkQueued" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.jobStates.includes("queued") ? "Hide" : "Show"} queued jobs`}><i className="bi-inbox"></i></label>
                <input type="checkbox" className="btn-check" id="checkRunning" onChange={props.showRunningClicked} checked={props.jobStates.includes("running")} />
                <label className={`btn btn-outline-${cardColor["running"]}`} htmlFor="checkRunning" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.jobStates.includes("running") ? "Hide" : "Show"} running jobs`}><i className="bi-gear-fill"></i></label>
                <input type="checkbox" className="btn-check" id="checkPassed" onChange={props.showPassedClicked} checked={props.jobStates.includes("passed")} />
                <label className={`btn btn-outline-${cardColor["passed"]}`} htmlFor="checkPassed" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.jobStates.includes("passed") ? "Hide" : "Show"} passed jobs`}><i className="bi-check-circle-fill"></i></label>
                <input type="checkbox" className="btn-check" id="checkErrored" onChange={props.showErroredClicked} checked={props.jobStates.includes("errored")} />
                <label className={`btn btn-outline-${cardColor["errored"]}`} htmlFor="checkErrored" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.jobStates.includes("errored") ? "Hide" : "Show"} errored jobs`}><i className="bi-x-circle-fill"></i></label>
                <input type="checkbox" className="btn-check" id="checkStopped" onChange={props.showStoppedClicked} checked={props.jobStates.includes("stopped")} />
                <label className={`btn btn-outline-${cardColor["stopped"]}`} htmlFor="checkStopped" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.jobStates.includes("stopped") ? "Hide" : "Show"} stopped jobs`}><i className="bi-dash-circle-fill"></i></label>
            </div>
            <div className="input-group m-1 ">
                <div className="input-group-text d-none d-sm-block" id="inputSearchCommit"><i className="bi-tag"></i></div>
                <input type="text" className="form-control d-none d-sm-block" placeholder="Commit SHA" aria-label="Commit SHA" aria-describedby="inputSearchCommit" value={props.commitSha} onChange={props.commitShaChanged} onKeyUp={props.keyUp} />
            </div>
            <div className="input-group m-1">
                <div className="input-group-text d-none d-sm-block" id="inputSearchAuthor"><i className="bi-person"></i></div>
                <input type="text" className="form-control d-none d-sm-block" placeholder="Commit author" aria-label="Commit author" aria-describedby="inputSearchAuthor" value={props.commitAuthor} onChange={props.commitAuthorChanged} onKeyUp={props.keyUp} />
            </div>
            {(props.jobType === "pr") && <div className="input-group m-1" style={{maxWidth: "250px"}}>
                <div className="input-group-text d-none d-sm-block" id="inputSearchPR">PR #</div>
                <input type="text" className="form-control d-none d-sm-block" placeholder="PR number" aria-label="PR number" aria-describedby="inputSearchPR" value={props.prNumber} onChange={props.prNumberChanged} onKeyUp={props.keyUp} />
            </div>}
            {(props.jobType === "branch") && <div className="input-group m-1" style={{maxWidth: "250px"}}>
                <div className="input-group-text d-none d-sm-block" id="inputSearchBranch">Branch</div>
                <input type="text" className="form-control d-none d-sm-block" placeholder="Branch name" aria-label="Branch name" aria-describedby="inputSearchBranch" value={props.branch} onChange={props.branchChanged} onKeyUp={props.keyUp} />
            </div>}
            {(props.jobType === "tag") && <div className="input-group m-1" style={{maxWidth: "250px"}}>
                <div className="input-group-text d-none d-sm-block" id="inputSearchTag">Tag</div>
                <input type="text" className="form-control d-none d-sm-block" placeholder="Tag name" aria-label="Tag name" aria-describedby="inputSearchTag" value={props.tag} onChange={props.tagChanged} onKeyUp={props.keyUp} />
            </div>}
        </div>
    )
}

const JobList = (props) => {
    const [ jobsFetched, setJobsFetched ] = useState(false);
    const [ jobs, setJobs ] = useState([]);
    const [ jobsDisplayedLimit, setJobsDisplayedLimit ] = useState(itemsDisplayedStep);
    const [ jobType, setJobType ] = useState("all");
    const [ jobStates, setJobStates ] = useState(["queued", "running", "passed", "errored", "stopped"]);
    const [ prNumber, setPrNumber ] = useState("");
    const [ branch, setBranch ] = useState("");
    const [ tag, setTag ] = useState("");
    const [ commitSha, setCommitSha ] = useState("");
    const [ commitAuthor, setCommitAuthor ] = useState("");

    const fetchJobs = useCallback(
        () => {
            let queryString = `limit=${jobsDisplayedLimit}&states=${jobStates.join("+")}`;
            if (jobType === "pr") {
                queryString = `${queryString}&is_pr=true`
            }
            if (jobType === "branch") {
                queryString = `${queryString}&is_branch=true`
            }
            if (jobType === "tag") {
                queryString = `${queryString}&is_tag=true`
            }
            if (jobType === "pr" && prNumber) {
                queryString = `${queryString}&prnum=${prNumber}`
            }
            if (jobType === "branch" && branch) {
                queryString = `${queryString}&branch=${branch}`
            }
            if (jobType === "tag" && tag) {
                queryString = `${queryString}&tag=${tag}`
            }
            if (commitSha) {
                queryString = `${queryString}&sha=${commitSha}`
            }
            if (commitAuthor) {
                queryString = `${queryString}&author=${commitAuthor}`
            }
            axios.get(`${murdockHttpBaseUrl}/jobs?${queryString}`)
                .then(res => {
                    setJobsFetched(true);
                    setJobs(res.data);
                })
                .catch(error => {
                    console.log(error);
                    setJobsFetched(true);
                    setJobs([]);
                });
        }, [
            jobsDisplayedLimit, jobType, jobStates, prNumber, branch, tag,
            commitSha, commitAuthor, setJobs, setJobsFetched
        ]
    )

    const handleWsData = (data) => {
        if (!jobsFetched) {
            return;
        }

        const msg = JSON.parse(data);
        if (msg.cmd === "reload") {
            fetchJobs();
        }
        else if (msg.cmd === "status") {
            let jobsTmp = jobs.slice();
            for (let idx = 0; idx < jobs.length; idx++) {
                if (jobs[idx].uid === msg.uid) {
                    jobsTmp[idx].status = msg.status;
                }
            }
            setJobs(jobsTmp);
        }
        else if (msg.cmd === "output") {
            let jobsTmp = jobs.slice();
            for (let idx = 0; idx < jobs.length; idx++) {
                if (jobs[idx].uid === msg.uid) {
                    jobsTmp[idx].output += msg.line;
                }
            }
            setJobs(jobsTmp);
        }
    }

    const handleWsOpen = () => {
        console.log("Websocket opened");
    }

    const handleWsClose = () => {
        console.log("Websocket closed");
    }

    const displayMore = () => {
        setJobsDisplayedLimit(jobs.length + itemsDisplayedStep);
        fetchJobs();
    }

    const search = () => {
        setJobsFetched(false);
    }

    const isAllClicked = () => {
        setJobType("all");
        search();
    }

    const isPRClicked = () => {
        setJobType("pr");
        search();
    }

    const isBranchClicked = () => {
        setJobType("branch");
        search();
    }

    const isTagClicked = () => {
        setJobType("tag");
        search();
    }

    const updateJobStates = (state) => {
        let states = jobStates.slice();
        if (jobStates.includes(state)) {
            setJobStates(states.filter(elem => elem !== state));
        } else {
            states.push(state);
            setJobStates(states);
        }
    }

    const showQueuedClicked = () => {
        updateJobStates("queued");
        search();
    }

    const showRunningClicked = () => {
        updateJobStates("running");
        search();
    }

    const showPassedClicked = () => {
        updateJobStates("passed");
        search();
    }

    const showErroredClicked = () => {
        updateJobStates("errored");
        search();
    }

    const showStoppedClicked = () => {
        updateJobStates("stopped");
        search();
    }

    const prNumberChanged = (event) => {
        setPrNumber(event.target.value);
    }

    const branchChanged = (event) => {
        setBranch(event.target.value)
    }

    const tagChanged = (event) => {
        setTag(event.target.value);
    }

    const commitShaChanged = (event) => {
        setCommitSha(event.target.value)
    }

    const commitAuthorChanged = (event) => {
        setCommitAuthor(event.target.value);
    }

    const keyUp = (event) => {
        if (event.key === 'Enter') {
            search();
        }
    }

    useEffect(
        () => {
            document.title = "Murdock - Dashboard";
            if (!jobsFetched) {
                fetchJobs();
            }

            const favicon = document.getElementById("favicon");
            if (favicon) {
                favicon.href = "/favicon.ico";
            }
        }, [jobsFetched, fetchJobs]
    )

    return (
        <>
            <JobSearch
                jobType={jobType}
                jobStates={jobStates}
                commitSha={commitSha}
                commitAuthor={commitAuthor}
                prNumber={prNumber}
                branch={branch}
                tag={tag}
                isAllClicked={isAllClicked}
                isPRClicked={isPRClicked}
                isBranchClicked={isBranchClicked}
                isTagClicked={isTagClicked}
                showQueuedClicked={showQueuedClicked}
                showRunningClicked={showRunningClicked}
                showPassedClicked={showPassedClicked}
                showErroredClicked={showErroredClicked}
                showStoppedClicked={showStoppedClicked}
                commitShaChanged={commitShaChanged}
                commitAuthorChanged={commitAuthorChanged}
                prNumberChanged={prNumberChanged}
                branchChanged={branchChanged}
                tagChanged={tagChanged}
                keyUp={keyUp}
            />
            {
                (!jobsFetched) ? (
                    <LoadingSpinner />
                ) : (jobs.length) ? (
                <>
                <div className="d-block d-sm-none">
                    <JobsTableSmall jobs={jobs} user={props.user} permissions={props.userPermissions} notify={props.notify}/>
                </div>
                <div className="d-none d-sm-block">
                    <JobsTable jobs={jobs} user={props.user} permissions={props.userPermissions} notify={props.notify}/>
                </div>
                </>
                ) : (
                    <div className="row my-5 justify-content-center">
                        <div className="col col-md-3 text-center">
                            <span className="text-secondary">No job matching</span>
                        </div>
                    </div>
                )
            }
            {(jobsFetched && jobs.length >= jobsDisplayedLimit) ? <ShowMore onclick={displayMore} /> : null}
            <Websocket
                url={murdockWsUrl}
                onOpen={handleWsOpen}
                onMessage={handleWsData}
                onClose={handleWsClose}
            />
        </>
    )
}

export default JobList;
