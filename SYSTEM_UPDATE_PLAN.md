# Sahatak Healthcare Application - System Update Plan
**Last Updated:** January 10, 2026  
**Status:** Active  
**Maintained By:** Development Team

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Technology Stack](#current-technology-stack)
3. [Dependency Analysis](#dependency-analysis)
4. [Security Assessment](#security-assessment)
5. [Update Priorities](#update-priorities)
6. [Upgrade Pathways](#upgrade-pathways)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Strategy](#deployment-strategy)
9. [Infrastructure Improvements](#infrastructure-improvements)
10. [Timeline & Milestones](#timeline--milestones)
11. [Rollback Procedures](#rollback-procedures)

---

## Executive Summary

Sahatak is a bilingual (Arabic/English) healthcare platform delivering patient care coordination, telemedicine, and AI-assisted medical assessments. The current architecture uses:

- **Backend:** Flask 2.3.3 with Python 3.x, MySQL database, WebSocket real-time communication
- **Frontend:** Vanilla JavaScript (ES6+) PWA with Bootstrap 5
- **Deployment:** PythonAnywhere (backend), GitHub Pages (frontend)

**Key Findings:**
- ✅ Core dependencies are modern and maintained
- ⚠️ Several dependencies have available updates (1-2+ versions behind latest)
- 🔴 Python version not explicitly pinned (security & compatibility risk)
- 🔴 Frontend has no dependency management system (npm/yarn)
- 📋 Missing CI/CD pipeline and automated testing framework
- 📋 No Docker containerization for consistent deployment

**Recommended Actions:**
- Phase 1 (Q1 2026): Security patches and dependency updates
- Phase 2 (Q2 2026): Infrastructure modernization (CI/CD, containerization)
- Phase 3 (Q3 2026): Frontend dependency management system

---

## Current Technology Stack

### Backend Overview
| Component | Current Version | Release Date | Status |
|-----------|-----------------|--------------|--------|
| **Python** | Not pinned | — | ⚠️ High risk |
| **Flask** | 2.3.3 | Aug 2023 | ✅ Current |
| **Werkzeug** | 2.3.7 | Aug 2023 | ⚠️ 1-2 versions behind |
| **SQLAlchemy** | 2.0.23 | Jan 2024 | ✅ Current |
| **Flask-SQLAlchemy** | 3.0.5 | Oct 2023 | ✅ Current |

### Database & ORM
| Component | Current Version | Release Date | Status |
|-----------|-----------------|--------------|--------|
| **PyMySQL** | 1.1.0 | Sep 2023 | ✅ Current |
| **SQLAlchemy** | 2.0.23 | Jan 2024 | ✅ Current |

### Authentication & Security
| Component | Current Version | Release Date | Status | Notes |
|-----------|-----------------|--------------|--------|-------|
| **flask-bcrypt** | 1.0.1 | Oct 2021 | ⚠️ Outdated | 2+ years old; consider flask-argon2 |
| **PyJWT** | 2.10.1 | Jan 2025 | ✅ Current | Latest version |
| **cryptography** | 41.0.7 | Oct 2023 | ⚠️ Update available | Security patches recommended |
| **email-validator** | 2.1.0 | Jun 2023 | ✅ Current | |

### API & Web Services
| Component | Current Version | Release Date | Status |
|-----------|-----------------|--------------|--------|
| **Flask-CORS** | 4.0.0 | Jan 2023 | ✅ Current |
| **Flask-SocketIO** | 5.3.6 | Feb 2023 | ✅ Current |
| **Flask-Login** | 0.6.3 | Jun 2022 | ✅ Current |
| **httpx** | 0.27.2 | Jan 2025 | ✅ Current |

### Business Logic & Services
| Component | Current Version | Release Date | Status |
|-----------|-----------------|--------------|--------|
| **Flask-Mail** | 0.9.1 | May 2022 | ⚠️ Outdated | 2+ years old |
| **APScheduler** | 3.10.4 | Jan 2023 | ✅ Current | 4.x beta available |
| **OpenAI** | 1.55.3 | Jan 2025 | ✅ Latest | Monitor for API changes |

### Utilities
| Component | Current Version | Release Date | Status |
|-----------|-----------------|--------------|--------|
| **python-dotenv** | 1.0.0 | Apr 2022 | ✅ Current |
| **psutil** | 5.9.6 | May 2022 | ⚠️ Outdated | 2+ years old; update to 5.x latest |

### Frontend Stack
| Component | Status | Notes |
|-----------|--------|-------|
| **Framework** | Vanilla JavaScript (ES6+) | ✅ Modern |
| **HTML/CSS** | HTML5 & CSS3 | ✅ Current |
| **Bootstrap** | 5.x (via CDN) | ✅ Current |
| **i18n** | Custom JSON-based | ✅ Functional |
| **PWA Support** | manifest.json | ✅ Enabled |
| **Package Management** | ❌ None | 🔴 Critical gap |

---

## Dependency Analysis

### Critical Gaps & Risks

#### 1. **Python Runtime Version Not Pinned** 🔴 HIGH RISK
- **Issue:** No explicit Python version requirement in requirements.txt
- **Risk:** Deployment may fail on incompatible Python versions; no reproducible builds
- **Recommendation:** Add explicit Python version requirement
  ```bash
  python>=3.9,<3.13
  ```
- **Action Items:**
  - [ ] Test current codebase with Python 3.9, 3.10, 3.11, 3.12
  - [ ] Pin version in requirements.txt and PythonAnywhere environment config
  - [ ] Document minimum and maximum supported versions

#### 2. **Frontend Dependency Management Missing** 🔴 HIGH RISK
- **Issue:** No npm/yarn/pnpm - all frontend dependencies are manual CDN includes
- **Risk:** No version tracking, no security audits, no dependency conflict resolution
- **Recommendation:** Implement npm-based frontend build system
  ```bash
  npm init
  npm install bootstrap@latest
  npm install --save-dev webpack parcel vite
  ```
- **Action Items:**
  - [ ] Create package.json with all frontend dependencies
  - [ ] Set up build pipeline (webpack, Vite, or Parcel)
  - [ ] Implement CSS/JS minification for production
  - [ ] Configure source maps for debugging

#### 3. **flask-bcrypt Outdated** ⚠️ MEDIUM RISK
- **Current:** 1.0.1 (Oct 2021)
- **Latest:** 1.0.1 (no updates)
- **Issue:** Consider moving to argon2-cffi (recommended by OWASP)
- **Recommendation:** 
  ```bash
  pip install argon2-cffi>=21.3.0
  ```
- **Migration Path:** Create migration script to rehash existing passwords on next login

#### 4. **Flask-Mail Outdated** ⚠️ MEDIUM RISK
- **Current:** 0.9.1 (May 2022)
- **Latest:** 0.9.1 (no updates, appears unmaintained)
- **Risk:** No security updates; SMTP vulnerability patches not applied
- **Recommendation:** Consider migration to
  - **Option A:** Flask-Mail 0.10.0+ (if released)
  - **Option B:** Direct SMTP implementation with smtplib (more control)
  - **Option C:** Celery + direct SMTP (for async emails)
- **Action:** Evaluate migration after security audit

#### 5. **psutil Outdated** ⚠️ LOW-MEDIUM RISK
- **Current:** 5.9.6 (May 2022)
- **Latest:** 5.9.x stable (latest in 5.x branch)
- **Action:** Update to latest 5.x version
  ```bash
  pip install --upgrade psutil
  ```

#### 6. **Werkzeug Version** ⚠️ LOW RISK
- **Current:** 2.3.7 (automatically installed with Flask 2.3.3)
- **Latest:** 3.x+ available
- **Note:** Will be updated with Flask 2.4.x upgrade

---

## Security Assessment

### Vulnerability Review

| Component | Version | CVEs | Status | Action |
|-----------|---------|------|--------|--------|
| Flask | 2.3.3 | None known | ✅ Safe | Monitor |
| cryptography | 41.0.7 | Check NIST | ⚠️ Review | Update to latest |
| SQLAlchemy | 2.0.23 | None known | ✅ Safe | Monitor |
| PyJWT | 2.10.1 | None recent | ✅ Safe | Monitor |
| OpenAI | 1.55.3 | Check | ✅ Safe | Monitor for API changes |

### Security Practices Review

**Authentication & Session Management:**
- ✅ flask-bcrypt for password hashing
- ✅ PyJWT for token-based auth
- ⚠️ Check session cookie flags (secure, httponly, samesite)
- ⚠️ CORS configuration needs review for production

**Database Security:**
- ✅ SQLAlchemy ORM (SQL injection protection)
- ⚠️ Verify parameterized queries used consistently
- ⚠️ Implement connection pooling config

**API Security:**
- ✅ Flask-CORS enabled
- ⚠️ Review CORS whitelist (should not allow *)
- ⚠️ Implement rate limiting
- ⚠️ Add API authentication headers validation

**Email Security:**
- ⚠️ TLS/SSL enforcement for SMTP
- ⚠️ Secure credential handling (.env file with strong permissions)
- ⚠️ Email template sanitization

### Recommended Security Updates

1. **Immediate (This Month):**
   - [ ] Audit CORS and session security settings
   - [ ] Review and update cryptography library
   - [ ] Implement request rate limiting

2. **Short-term (This Quarter):**
   - [ ] Update psutil to latest
   - [ ] Evaluate Flask-Mail alternatives
   - [ ] Implement request signing and validation

3. **Medium-term (This Year):**
   - [ ] Upgrade to Argon2 for password hashing
   - [ ] Implement WAF (Web Application Firewall) rules
   - [ ] Regular security audits and penetration testing

---

## Update Priorities

### Priority 1: Critical (Do First)
**Timeline:** Immediately - January 2026
**Risk Level:** High impact if not addressed

- [ ] **Pin Python version** to 3.10 or 3.11
- [ ] **Update cryptography** to latest
  ```bash
  pip install --upgrade cryptography
  ```
- [ ] **Security audit:** CORS, session, authentication
- [ ] **Review email security:** TLS/SSL, credential handling
- [ ] **Add requirements-dev.txt** for development dependencies

**Estimated Effort:** 8-16 hours

### Priority 2: High (Next)
**Timeline:** Q1 2026 (January-March)
**Risk Level:** Medium - improves security and compatibility

- [ ] **Update psutil**
  ```bash
  pip install --upgrade psutil
  ```
- [ ] **Investigate Flask-Mail alternatives** and plan migration
- [ ] **Implement frontend package.json** (no code changes needed, setup only)
- [ ] **Add CI/CD pipeline** (GitHub Actions)
- [ ] **Set up automated dependency scanning** (Dependabot, WhiteSource)

**Estimated Effort:** 20-30 hours

### Priority 3: Medium (This Year)
**Timeline:** Q2-Q3 2026
**Risk Level:** Low-Medium - enhancements and future-proofing

- [ ] **Upgrade flask-bcrypt to Argon2**
  ```bash
  pip install argon2-cffi
  # Migrate existing password hashes
  ```
- [ ] **Implement Docker containerization**
- [ ] **Add automated testing framework** (pytest)
- [ ] **Optimize frontend** (minification, bundling)
- [ ] **Upgrade APScheduler** to 4.x (when stable)

**Estimated Effort:** 40-60 hours

### Priority 4: Low (Future Consideration)
**Timeline:** 2027+
**Risk Level:** Low - nice-to-have improvements

- [ ] **Migrate to async backend** (FastAPI, Quart)
- [ ] **Implement GraphQL API** (alongside REST)
- [ ] **Add TypeScript to frontend**
- [ ] **Full-stack TypeScript** with Node.js backend option

**Estimated Effort:** 100+ hours

---

## Upgrade Pathways

### Path A: Minimal Updates (Recommended for Now)
**Scope:** Security patches only  
**Timeline:** 1-2 weeks  
**Risk:** Very Low

```bash
# 1. Update minor versions only
pip install --upgrade \
  cryptography \
  psutil \
  httpx

# 2. Test thoroughly
pytest tests/ -v

# 3. Deploy to staging
# 4. Deploy to production after 24h monitoring
```

### Path B: Moderate Updates (Q2 2026)
**Scope:** Major dependency updates, infrastructure setup  
**Timeline:** 4-6 weeks  
**Risk:** Low-Medium

```bash
# 1. Create Python 3.11 virtual environment
python -m venv venv-3.11

# 2. Install updated dependencies
pip install -r requirements.txt --upgrade

# 3. Test application
pytest tests/ -v

# 4. Test with Flask 2.4.x (when released)
pip install --upgrade Flask>=2.4.0

# 5. Set up CI/CD pipeline
# 6. Deploy to staging first
# 7. Monitor for 1 week before production
```

### Path C: Major Refactoring (2027+)
**Scope:** Full-stack modernization  
**Timeline:** 3-6 months  
**Risk:** Medium-High

- Migrate from Flask to FastAPI (async support)
- Implement TypeScript frontend
- Switch from MySQL to PostgreSQL (optional)
- Full containerization with Docker/Kubernetes

---

## Testing Strategy

### Unit Testing
**Framework:** pytest  
**Coverage Target:** 80%+

```bash
# Installation
pip install pytest pytest-cov pytest-mock

# Run tests
pytest tests/ -v --cov=backend --cov-report=html

# Check coverage
coverage report
```

### Integration Testing
- Test API endpoints with actual database
- Test WebSocket connections
- Test email service integration
- Test file uploads/downloads

### Security Testing
- [ ] SQL injection attempts
- [ ] XSS vulnerability checks
- [ ] CSRF token validation
- [ ] Authentication bypass attempts
- [ ] Rate limiting effectiveness

### Performance Testing
- [ ] Load testing with 100+ concurrent users
- [ ] Database query optimization
- [ ] API response time benchmarking
- [ ] Memory usage monitoring

### Staging Environment Setup
```yaml
Staging Server:
  URL: staging.sahatak.example.com
  Database: Replica of production
  Data: Sanitized production data
  Features: All updates tested here first
  Monitoring: Full logging and monitoring enabled
  Duration: Minimum 7 days before production
```

---

## Deployment Strategy

### Development Environment
```
Local machine with:
- Python 3.11 venv
- MySQL 8.0+
- Node.js 18+ (after npm setup)
- All dependencies in requirements.txt
```

### Staging Environment
```
PythonAnywhere staging account with:
- Python 3.11
- Same MySQL version as production
- Separate web app configuration
- Full feature parity with production
```

### Production Environment
```
PythonAnywhere production with:
- Python 3.11 (or higher)
- MySQL production database
- SSL/TLS enabled
- Backup procedures enabled
```

### Deployment Checklist

**Before Deployment:**
- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] Staging environment fully tested (7 days)
- [ ] Database backup taken
- [ ] Rollback plan documented
- [ ] Communication sent to users (if needed)

**During Deployment:**
- [ ] Deploy to staging first
- [ ] Monitor error logs for 1 hour
- [ ] Verify all critical features work
- [ ] Check database connections
- [ ] Verify email service
- [ ] Test WebSocket connections

**After Deployment:**
- [ ] Monitor production logs for 24 hours
- [ ] Alert team on any errors
- [ ] Verify performance metrics
- [ ] Gather user feedback
- [ ] Document any issues

### Deployment Windows
**Recommended:** Tuesday-Thursday, 2-4 AM (local timezone)  
**Avoid:** Friday-Sunday, holidays  
**Maximum Downtime:** 15-30 minutes

### Rollback Procedure
**If Critical Issues Occur:**
1. Immediately revert to previous Python version
2. Restore database from backup
3. Switch back to previous application code
4. Notify users and team
5. Post-mortem analysis

**Estimated Rollback Time:** 5-10 minutes

---

## Infrastructure Improvements

### Phase 1: CI/CD Pipeline (Q1 2026)

**Tool:** GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements-dev.txt
      - run: pytest tests/ -v --cov=backend
      - run: flake8 backend/
```

**Benefits:**
- Automated testing on every commit
- Catch breaking changes early
- Consistent code quality
- Automated dependency scanning

### Phase 2: Containerization (Q2 2026)

**Tool:** Docker + Docker Compose

```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["flask", "run"]
```

**Benefits:**
- Consistent dev/staging/production environments
- Easier deployment to cloud
- Easier scaling and load balancing
- Better isolation and security

### Phase 3: Frontend Build System (Q2-Q3 2026)

**Tool:** npm + Vite or Webpack

```bash
npm init -y
npm install --save bootstrap@5 axios
npm install --save-dev vite
npm run build  # Minify and optimize
```

**Benefits:**
- Dependency tracking and auditing
- Automated minification and bundling
- Source maps for debugging
- Better performance (lazy loading, tree-shaking)

### Phase 4: Infrastructure as Code (Q3 2026)

**Tool:** Terraform or CloudFormation

```hcl
# main.tf
resource "pythonanywhere_web_app" "production" {
  domain_name = "sahatak.example.com"
  python_version = "3.11"
  source_code_url = "https://github.com/sahatak/backend"
}
```

**Benefits:**
- Reproducible infrastructure
- Version-controlled configuration
- Easier disaster recovery
- Multi-environment management

---

## Timeline & Milestones

### Q1 2026 (January - March)

| Week | Task | Owner | Status |
|------|------|-------|--------|
| W1-2 | Security audit and Python version pinning | DevOps | ⏳ Not Started |
| W2-3 | Update critical dependencies | Backend Lead | ⏳ Not Started |
| W3-4 | Set up pytest and unit tests | QA/Backend | ⏳ Not Started |
| W4-5 | Implement GitHub Actions CI/CD | DevOps | ⏳ Not Started |
| W5-6 | Frontend package.json setup | Frontend Lead | ⏳ Not Started |
| W6-8 | Testing and staging deployment | QA | ⏳ Not Started |
| W9 | Production release v1.1 | DevOps | ⏳ Not Started |

### Q2 2026 (April - June)

| Task | Owner | Status |
|------|-------|--------|
| Docker containerization | DevOps | ⏳ Not Started |
| Flask-Mail migration | Backend Lead | ⏳ Not Started |
| Frontend build pipeline | Frontend Lead | ⏳ Not Started |
| Load testing & optimization | QA/Perf | ⏳ Not Started |
| Production release v1.2 | DevOps | ⏳ Not Started |

### Q3 2026 (July - September)

| Task | Owner | Status |
|------|-------|--------|
| Argon2 password migration | Security | ⏳ Not Started |
| APScheduler 4.x upgrade | Backend Lead | ⏳ Not Started |
| Infrastructure as Code setup | DevOps | ⏳ Not Started |
| Full-stack monitoring setup | DevOps | ⏳ Not Started |
| Production release v1.3 | DevOps | ⏳ Not Started |

---

## Rollback Procedures

### Quick Rollback (Immediate Revert)

**Scenario:** Critical bug discovered immediately after deployment

**Steps:**
```bash
# 1. Revert code to previous version
git revert <commit-hash>
git push origin main

# 2. Restore database from backup
mysqldump -u user -p database > backup-current.sql
mysql -u user -p database < backup-previous.sql

# 3. Restart application
# (In PythonAnywhere) Reload web app

# 4. Verify critical functions work
curl -i http://sahatak.example.com/api/health

# 5. Notify team
# Send Slack/email alert
```

**Time to Execute:** 5-10 minutes

### Staged Rollback (Gradual Revert)

**Scenario:** Issues appear after 24+ hours

**Steps:**
```bash
# 1. Create new database backup
mysqldump -u user -p database > backup-current.sql

# 2. Restore to snapshot from 24 hours ago
mysql -u user -p database < backup-24h-ago.sql

# 3. Revert code
git revert <commit-hash>
git push origin main

# 4. Monitor in staging first
# Deploy to staging environment
# Run full test suite

# 5. Deploy to production
# Monitor for 4 hours

# 6. If still issues, continue rollback
```

**Time to Execute:** 30-60 minutes

### Full Rollback (Complete Reversal)

**Scenario:** Multiple system-wide issues discovered

**Steps:**
```bash
# 1. Declare incident
# Notify all stakeholders

# 2. Create backup of current state
mysqldump -u user -p database > backup-incident.sql
git tag incident-backup

# 3. Restore from last known good state
# Could be from 1 week+ ago

# 4. Deploy to production
git checkout last-known-good-tag
git push origin main --force-with-lease

# 5. Perform full validation
# Run all test suites
# Manual QA testing

# 6. Post-incident analysis
# Root cause analysis
# Prevention measures
```

**Time to Execute:** 2-4 hours  
**Data Loss Risk:** Potential loss of last 24-48 hours of data

### Backup Strategy

| Frequency | Type | Retention | Location |
|-----------|------|-----------|----------|
| Hourly | Automated MySQL | 7 days | AWS S3 |
| Daily | Full backup | 30 days | AWS S3 + Local |
| Weekly | Archives | 1 year | Cold storage |

**Testing:** Restore from backup once per month to verify integrity

---

## Communication & Documentation

### Update Documentation Requirements

**After Each Major Update:**
- [ ] Update this SYSTEM_UPDATE_PLAN.md
- [ ] Document breaking changes in CHANGELOG.md
- [ ] Update deployment guide
- [ ] Update API documentation (if applicable)
- [ ] Update user-facing documentation

### Team Communication

**Before Deployment:**
- Notify team 1 week in advance
- Hold pre-deployment meeting
- Review rollback procedures
- Confirm staging tests passed

**During Deployment:**
- Maintain status channel updates
- Document any issues in real-time
- Have team on standby for 1 hour post-deployment

**After Deployment:**
- Send completion notification
- Include version number and key changes
- Schedule post-deployment review meeting

### User Communication

**For Major Updates:**
- Announce in-app notification 1 week before
- Provide upgrade notes and new features
- Link to blog post or release notes
- Provide feedback channel

---

## References & Resources

### Dependencies
- Flask: https://flask.palletsprojects.com/
- SQLAlchemy: https://www.sqlalchemy.org/
- Flask-SocketIO: https://flask-socketio.readthedocs.io/
- PyJWT: https://pyjwt.readthedocs.io/

### Tools & Services
- GitHub Actions: https://github.com/features/actions
- Docker: https://www.docker.com/
- PythonAnywhere: https://www.pythonanywhere.com/

### Security
- OWASP: https://owasp.org/
- Python Security Guidelines: https://python.readthedocs.io/en/stable/library/security_warnings.html

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-10 | 1.0 | Development Team | Initial system update plan |

---

**For questions or updates to this plan, contact the Development Team.**
