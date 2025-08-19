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

import { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link,
    useLocation
  } from 'react-router-dom';

import axios from 'axios';
import GithubUserButton from './GithubUserButton';

import {
    defaultLoginUser,
    getUserFromStorage, removeUserFromStorage, storeUserToStorage
} from './userStorage';
import { LoadingSpinner } from './components';

const JobList = lazy(() => import('./JobList'));
const JobUid = lazy(() => import('./JobUid'));
const JobBranch = lazy(() => import('./JobBranch'));
const JobTag = lazy(() => import('./JobTag'));
const JobCommit = lazy(() => import('./JobCommit'));
const JobPr = lazy(() => import('./JobPr'));
const ApplicationResults = lazy(() => import('./ApplicationResults'));


const MurdockNavBar = (props) => {
    const location = useLocation();

    const role = (props.userPermissions === "push") ? "Maintainer" : "User";

    return (
        <nav className="navbar navbar-expand-lg sticky-top shadow navbar-dark bg-dark">
            <div className="container-fluid">
                <a className="navbar-brand" href={`https://github.com/${process.env.REACT_APP_GITHUB_REPO}`} target="_blank" rel="noopener noreferrer"><i className="bi-github me-1"></i>{process.env.REACT_APP_GITHUB_REPO}</a>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav me-auto my-2 my-lg-0 navbar-nav-scroll">
                        <li className="nav-item">
                            <Link to="/" className={location.pathname === "/" ? "nav-link active": "nav-link"}>Dashboard</Link>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href={`${process.env.REACT_APP_MURDOCK_HTTP_BASE_URL}/api`} target="_blank" rel="noopener noreferrer">API <i className="bi-box-arrow-up-right"></i></a>
                            <a className="nav-link" href={`${process.env.REACT_APP_PRIVACY_URL}`} target="_blank" rel="noopener noreferrer">Privacy Policy <i className="bi-box-arrow-up-right"></i></a>
                        </li>
                    </ul>
                    <div className="d-flex align-items-center">
                        <GithubUserButton user={props.user} role={role} onLoginSuccess={props.onLoginSuccess} onLoginFailure={props.onLoginFailure} onLogout={props.onLogout} />
                    </div>
                </div>
            </div>
        </nav>
    );
}

const Murdock = () => {
    const [ user, setUser ] = useState(getUserFromStorage());
    const [ userPermissions, setUserPermissions ] = useState("unknown");
    const [ alerts, setAlerts ] = useState([]);

    const onLoginSuccess = (response) => {
        const loggedUser = {
            login: response.profile.name,
            avatarUrl: response.profile.profilePicURL,
            token: response.token.accessToken,
            expiresAt: response.token.expiresAt,
        }
        storeUserToStorage(loggedUser);
        fetchUserPermissions(loggedUser);
    }

    const onLoginFailure = (error) => {
        console.error(error);
        setUserPermissions("no");
        setUser(defaultLoginUser);
    }

    const onLogout = () => {
        removeUserFromStorage(user);
        setUserPermissions("no");
        setUser(defaultLoginUser);
    }

    const fetchUserPermissions =  useCallback(
        (loggedUser) => {
            if (loggedUser === "anonymous") {
                setUserPermissions("no");
                setUser(defaultLoginUser);
                return;
            }

            axios.get(
              `https://api.github.com/repos/${process.env.REACT_APP_GITHUB_REPO}`,
              { headers: {Authorization: `token ${loggedUser.token}`}},
            )
            .then(res => {
              if (res.data.permissions && res.data.permissions.push) {
                setUser(loggedUser);
                setUserPermissions("push");
              } else {
                setUser(loggedUser);
                setUserPermissions("no");
              }
            })
            .catch(error => {
              console.log(error);
              setUser(loggedUser);
              setUserPermissions("no");
            });
        }, [setUser, setUserPermissions]
    )

    const notify = (uid, result, message) => {
        const alertsList = alerts.slice();
        alertsList.push({uid: uid, result: result, message: message})
        setAlerts(alertsList.reverse());
        setTimeout(() => {
            const alertsList = alerts.filter(item => item.uid !== uid);
            setAlerts(alertsList);
        }, 6000);
    }

    useEffect(() => {
        if (userPermissions === "unknown") {
            fetchUserPermissions(user);
        }
    }, [user, userPermissions, fetchUserPermissions])

    return (
      <Router>
          <MurdockNavBar user={user} userPermissions={userPermissions} onLoginSuccess={onLoginSuccess} onLoginFailure={onLoginFailure} onLogout={onLogout} />
          <div className="container">
          <div className="position-fixed bottom-0 end-0 p-3" style={{zIndex:11}}>
          {
              alerts.map(item => (
                  <div key={item.uid} className="toast show m-1" role="alert" aria-live="assertive" aria-atomic="true">
                      <div className={`toast-body text-${item.result}`}>
                          <i className={`bi-${(item.result === "danger") ? "x" : "info"}-circle-fill me-2`}></i>{item.message}
                      </div>
                  </div>
              ))
          }
          </div>
          <Suspense fallback={<div className="container"><LoadingSpinner /></div>}>
              <Switch>
                  <Route exact path="/details/branch/:branch" render={() => <JobBranch user={user} userPermissions={userPermissions} notify={notify} />} />
                  <Route exact path="/details/branch/:branch/:tab" render={() => <JobBranch user={user} userPermissions={userPermissions} notify={notify} />} />
                  <Route exact path="/details/tag/:tag" render={() => <JobTag user={user} userPermissions={userPermissions} notify={notify} />} />
                  <Route exact path="/details/tag/:tag/:tab" render={() => <JobTag user={user} userPermissions={userPermissions} notify={notify} />} />
                  <Route exact path="/details/commit/:commit" render={() => <JobCommit user={user} userPermissions={userPermissions} notify={notify} />} />
                  <Route exact path="/details/commit/:commit/:tab" render={() => <JobCommit user={user} userPermissions={userPermissions} notify={notify} />} />
                  <Route exact path="/details/pr/:prnum" render={() => <JobPr user={user} userPermissions={userPermissions} notify={notify} />} />
                  <Route exact path="/details/pr/:prnum/:tab" render={() => <JobPr user={user} userPermissions={userPermissions} notify={notify} />} />
                  <Route exact path="/details/:uid" render={() => <JobUid user={user} userPermissions={userPermissions} notify={notify} />} />
                  <Route exact path="/details/:uid/:tab" render={() => <JobUid user={user} userPermissions={userPermissions} notify={notify} />} />
                  <Route exact path="/details/:uid/builds/:application" render={() => <ApplicationResults type="builds" />} />
                  <Route exact path="/details/:uid/tests/:application" render={() => <ApplicationResults type="tests" />} />
                  <Route path="/" render={() => <JobList user={user} userPermissions={userPermissions} notify={notify} />} />
              </Switch>
          </Suspense>
          </div>
      </Router>
    );
};

export default Murdock;
