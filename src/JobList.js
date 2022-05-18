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
import { useHistory, useLocation } from 'react-router-dom';
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
                <th scope="col" className="text-left">State</th>
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
            <div className="btn-group btn-group-sm m-1" role="group">
                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkAll" onChange={() => props.updateJobType("all")} checked={props.queryParams.type === "all"} />
                <label className="btn btn-outline-primary" htmlFor="checkAll">All</label>
                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkPRs" onChange={() => props.updateJobType("pr")} checked={props.queryParams.type === "pr"} />
                <label className="btn btn-outline-primary" htmlFor="checkPRs">PRs</label>
                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkBranches" onChange={() => props.updateJobType("branch")} checked={props.queryParams.type === "branch"} />
                <label className="btn btn-outline-primary" htmlFor="checkBranches">Branches</label>
                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkTags" onChange={() => props.updateJobType("tag")} checked={props.queryParams.type === "tag"} />
                <label className="btn btn-outline-primary" htmlFor="checkTags">Tags</label>
            </div>
            <div className="btn-group btn-group-sm m-1" role="group">
                <input type="checkbox" className="btn-check" id="checkQueued" onChange={() => props.updateJobStates("queued")} checked={props.queryParams.states.includes("queued")} />
                <label className={`btn btn-outline-${cardColor["queued"]}`} htmlFor="checkQueued" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.queryParams.states.includes("queued") ? "Hide" : "Show"} queued jobs`}><i className="bi-inbox"></i></label>
                <input type="checkbox" className="btn-check" id="checkRunning" onChange={() => props.updateJobStates("running")} checked={props.queryParams.states.includes("running")} />
                <label className={`btn btn-outline-${cardColor["running"]}`} htmlFor="checkRunning" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.queryParams.states.includes("running") ? "Hide" : "Show"} running jobs`}><i className="bi-gear-fill"></i></label>
                <input type="checkbox" className="btn-check" id="checkPassed" onChange={() => props.updateJobStates("passed")} checked={props.queryParams.states.includes("passed")} />
                <label className={`btn btn-outline-${cardColor["passed"]}`} htmlFor="checkPassed" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.queryParams.states.includes("passed") ? "Hide" : "Show"} passed jobs`}><i className="bi-check-circle-fill"></i></label>
                <input type="checkbox" className="btn-check" id="checkErrored" onChange={() => props.updateJobStates("errored")} checked={props.queryParams.states.includes("errored")} />
                <label className={`btn btn-outline-${cardColor["errored"]}`} htmlFor="checkErrored" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.queryParams.states.includes("errored") ? "Hide" : "Show"} errored jobs`}><i className="bi-x-circle-fill"></i></label>
                <input type="checkbox" className="btn-check" id="checkStopped" onChange={() => props.updateJobStates("stopped")} checked={props.queryParams.states.includes("stopped")} />
                <label className={`btn btn-outline-${cardColor["stopped"]}`} htmlFor="checkStopped" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.queryParams.states.includes("stopped") ? "Hide" : "Show"} stopped jobs`}><i className="bi-dash-circle-fill"></i></label>
            </div>
            <div className="input-group input-group-sm m-1 ">
                <div className="input-group-text d-none d-sm-block" id="inputSearchCommit"><i className="bi-tag"></i></div>
                <input type="text" className="form-control d-none d-sm-block" placeholder="Commit SHA" aria-label="Commit SHA" aria-describedby="inputSearchCommit" value={props.queryParams.sha} onChange={props.commitShaChanged} onKeyUp={props.keyUp} />
            </div>
            <div className="input-group input-group-sm m-1">
                <div className="input-group-text d-none d-sm-block" id="inputSearchAuthor"><i className="bi-person"></i></div>
                <input type="text" className="form-control d-none d-sm-block" placeholder="Commit author" aria-label="Commit author" aria-describedby="inputSearchAuthor" value={props.queryParams.author} onChange={props.commitAuthorChanged} onKeyUp={props.keyUp} />
            </div>
            {(props.queryParams.type === "pr") && <>
                <div className="input-group input-group-sm m-1" style={{maxWidth: "250px"}}>
                    <div className="input-group-text d-none d-sm-block" id="inputSearchPR">PR #</div>
                    <input type="text" className="form-control d-none d-sm-block" placeholder="PR number" aria-label="PR number" aria-describedby="inputSearchPR" value={props.queryParams.prnum} onChange={props.prNumberChanged} onKeyUp={props.keyUp} />
                </div>
                <div className="btn-group btn-group-sm m-1" role="group">
                    <input type="checkbox" className="btn-check" id="checkPrOpen" onChange={() => props.updatePrStates("open")} checked={props.queryParams.prstates.includes("open")} />
                    <label className={"btn btn-outline-primary"} htmlFor="checkPrOpen" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.queryParams.prstates.includes("open") ? "Hide" : "Show"} open PRs`}>Open</label>
                    <input type="checkbox" className="btn-check" id="checkPrClosed" onChange={() => props.updatePrStates("closed")} checked={props.queryParams.prstates.includes("closed")} />
                    <label className={"btn btn-outline-primary"} htmlFor="checkPrClosed" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.queryParams.prstates.includes("closed") ? "Hide" : "Show"} closed PRs`}>Closed</label>
                </div>
            </>}
            {(props.queryParams.type === "branch") && <div className="input-group input-group-sm m-1" style={{maxWidth: "250px"}}>
                <div className="input-group-text d-none d-sm-block" id="inputSearchBranch">Branch</div>
                <input type="text" className="form-control d-none d-sm-block" placeholder="Branch name" aria-label="Branch name" aria-describedby="inputSearchBranch" value={props.queryParams.branch} onChange={props.branchChanged} onKeyUp={props.keyUp} />
            </div>}
            {(props.queryParams.type === "tag") && <div className="input-group input-group-sm m-1" style={{maxWidth: "250px"}}>
                <div className="input-group-text d-none d-sm-block" id="inputSearchTag">Tag</div>
                <input type="text" className="form-control d-none d-sm-block" placeholder="Tag name" aria-label="Tag name" aria-describedby="inputSearchTag" value={props.queryParams.tag} onChange={props.tagChanged} onKeyUp={props.keyUp} />
            </div>}
        </div>
    )
}

const defaultQueryParams = {
    limit: itemsDisplayedStep,
    type: "all",
    states: ["queued", "running", "passed", "errored", "stopped"],
    prnum: "",
    prstates: ["open", "closed"],
    branch: "",
    tag: "",
    sha: "",
    author: "",
};

const JobList = (props) => {
    const location = useLocation();
    const history = useHistory();

    const [ jobsFetched, setJobsFetched ] = useState(false);
    const [ shouldFetch, setShouldFetched ] = useState(true);
    const [ jobs, setJobs ] = useState([]);
    const [ queryParams, setQueryParams ] = useState(Object.assign({}, defaultQueryParams));
    const [ queryUrl, setQueryUrl ] = useState("");

    const queryParamsToApiQuery = useCallback(
        (params) => {
            let apiQuery = `limit=${params.limit}&states=${params.states.join("+")}`;
            if (params.type === "pr") {
                apiQuery = `${apiQuery}&is_pr=true&prstates=${params.prstates.join("+")}`
            }
            if (params.type === "branch") {
                apiQuery = `${apiQuery}&is_branch=true`
            }
            if (params.type === "tag") {
                apiQuery = `${apiQuery}&is_tag=true`
            }
            if (params.type === "pr" && params.prnum) {
                apiQuery = `${apiQuery}&prnum=${params.prnum}`
            }
            if (params.type === "branch" && params.branch) {
                apiQuery = `${apiQuery}&branch=${params.branch}`
            }
            if (params.type === "tag" && params.tag) {
                apiQuery = `${apiQuery}&tag=${params.tag}`
            }
            if (params.sha) {
                apiQuery = `${apiQuery}&sha=${params.sha}`
            }
            if (params.author) {
                apiQuery = `${apiQuery}&author=${params.author}`
            }

            return apiQuery;
        }, []
    )

    const queryParamsToUrl = useCallback(
        (params) => {
            let url = "";
            for (const [param, value] of Object.entries(params)) {
                if (value === "") {
                    continue;
                }
                let paramQuery = ""
                if (param === "limit") {
                    if (value !== itemsDisplayedStep) {
                        paramQuery = `${param}=${value}`
                    }
                }
                else if (param === "type") {
                    if (["pr", "branch", "tag"].includes(value)) {
                        paramQuery = `${param}=${value}`
                    }
                }
                else if (param === "states") {
                    if (value.length < 5) {
                        paramQuery = `${param}=${value.join("+")}`
                    }
                }
                else if (param === "prstates" && params.type === "pr") {
                    if (value.length < 2) {
                        paramQuery = `${param}=${value.join("+")}`
                    }
                }
                else if (
                    (param === "branch" && params.type === "branch") ||
                    (param === "tag" && params.type === "tag") ||
                    (param === "prnum" && params.type === "pr") ||
                    (param === "author") || (param === "sha")) {
                    paramQuery = `${param}=${value}`
                }

                if (paramQuery === "") {
                    continue;
                }

                if (url === "") {
                    url = `${paramQuery}`
                }
                else {
                    url = `${url}&${paramQuery}`
                }
            }
            if (url !== "") {
                url = `?${url}`
            }
            return url
        }, []
    )

    const queryStringtoQueryParams = useCallback(
        (queryString) => {
            let params = Object.assign({}, defaultQueryParams);
            for (const [param, value] of new URLSearchParams(queryString)) {
                if (param === "limit") {
                    params.limit = value;
                }
                if (param === "type" && ["pr", "branch", "tag"].includes(value)) {
                    params.type = value;
                }
                if (param === "states") {
                    params.states = value.split(" ");
                }
                if (param === "prstates") {
                    params.prstates = value.split(" ");
                }
                if (param === "prnum") {
                    params.prnum = value;
                }
                if (param === "branch") {
                    params.branch = value;
                }
                if (param === "tag") {
                    params.tag = value;
                }
                if (param === "sha") {
                    params.sha = value;
                }
                if (param === "author") {
                    params.author = value;
                }
            }
            return params
        }, []
    )

    const fetchJobs = useCallback(
        () => {
            axios.get(`${murdockHttpBaseUrl}/jobs?${queryParamsToApiQuery(queryParams)}`)
                .then(res => {
                    setJobsFetched(true);
                    setJobs(res.data);
                })
                .catch(error => {
                    console.log(error);
                    setJobsFetched(true);
                    setJobs([]);
                });
            setShouldFetched(false);
        }, [
            queryParams, queryParamsToApiQuery, setJobs, setJobsFetched
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
        let params = Object.assign({}, queryParams);
        params.limit = parseInt(params.limit) + itemsDisplayedStep
        history.push(`/${queryParamsToUrl(params)}`)
    }

    const updateJobType = (type) => {
        let params = Object.assign({}, queryParams);
        params.type = type
        history.push(`/${queryParamsToUrl(params)}`)
    }

    const updateJobStates = (state) => {
        let params = Object.assign({}, queryParams);
        if (params.states.includes(state)) {
            params.states = params.states.filter(elem => elem !== state)
        } else {
            params.states.push(state);
        }
        history.push(`/${queryParamsToUrl(params)}`)
    }

    const updatePrStates = (state) => {
        let params = Object.assign({}, queryParams);
        if (params.prstates.includes(state)) {
            params.prstates = params.prstates.filter(elem => elem !== state)
        } else {
            params.prstates.push(state);
        }
        history.push(`/${queryParamsToUrl(params)}`)
    }

    const prNumberChanged = (event) => {
        let params = Object.assign({}, queryParams);
        params.prnum = event.target.value;
        setQueryParams(params);
    }

    const branchChanged = (event) => {
        let params = Object.assign({}, queryParams);
        params.branch = event.target.value;
        setQueryParams(params);
    }

    const tagChanged = (event) => {
        let params = Object.assign({}, queryParams);
        params.tag = event.target.value;
        setQueryParams(params);
    }

    const commitShaChanged = (event) => {
        let params = Object.assign({}, queryParams);
        params.sha = event.target.value;
        setQueryParams(params);
    }

    const commitAuthorChanged = (event) => {
        let params = Object.assign({}, queryParams);
        params.author = event.target.value;
        setQueryParams(params);
    }

    const keyUp = (event) => {
        if (event.key === 'Enter') {
            history.push(`/${queryParamsToUrl(queryParams)}`)
        }
    }

    useEffect(
        () => {
            document.title = "Murdock - Dashboard";
            const favicon = document.getElementById("favicon");
            if (favicon) {
                favicon.href = "/favicon.ico";
            }

            if (queryUrl !== location.search) {
                setQueryUrl(location.search);
                setQueryParams(queryStringtoQueryParams(location.search));
                setShouldFetched(true);
            }

            if (shouldFetch) {
                fetchJobs();
            }

        }, [
            shouldFetch, fetchJobs,
            setQueryParams, queryStringtoQueryParams,
            queryUrl, location.search
        ]
    )

    return (
        <>
            <JobSearch
                queryParams={queryParams}
                updateJobType={updateJobType}
                updateJobStates={updateJobStates}
                updatePrStates={updatePrStates}
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
            {(jobsFetched && jobs.length >= queryParams.limit) ? <ShowMore onclick={displayMore} /> : null}
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
