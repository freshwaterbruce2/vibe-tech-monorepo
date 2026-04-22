"""
Violation Detection Prompts for Vibe-Justice Legal AI.

Domain-specific prompts designed to instruct the AI to identify legal violations,
policy breaches, and procedural issues with specific citations and evidence.

Each prompt category includes:
- Specific violation patterns to detect
- Required evidence markers
- Citation requirements (statutes, regulations, case law)
- Risk assessment criteria
"""

from typing import Dict, List, Optional


# Walmart DC Employment Violations
WALMART_DC_PROMPTS: Dict[str, str] = {
    "attendance": """Analyze this document for Walmart attendance policy violations.

DETECTION CRITERIA:
1. Point accumulation exceeding policy limits (typically 5 points = termination)
2. Failure to properly apply PPTO (Protected Paid Time Off)
3. Retroactive point assessment after approved leave
4. Inconsistent application of attendance policy across associates
5. Failure to reset points after 6-month rolling period
6. Manager discretion applied unfairly or discriminatorily

REQUIRED ANALYSIS:
- Count documented attendance occurrences and points
- Verify PPTO was correctly applied per policy
- Check if ADA accommodations affected attendance
- Compare treatment to similarly situated associates

CITE: Walmart Associate Handbook, EEOC guidance on attendance policies, relevant FMLA regulations

OUTPUT: List each violation found with:
- Violation type and description
- Supporting evidence from document
- Applicable policy section or law
- Severity rating (Low/Medium/High/Critical)""",
    "fmla": """Analyze this document for FMLA (Family Medical Leave Act) violations.

DETECTION CRITERIA:
1. Denial of eligible FMLA leave request
2. Retaliation after FMLA leave (termination, demotion, schedule changes)
3. Failure to provide required FMLA notices
4. Interference with FMLA rights
5. Counting FMLA-protected absences against attendance
6. Failure to maintain health benefits during leave
7. Improper certification requirements
8. Denial of intermittent leave for chronic conditions

LEGAL FRAMEWORK:
- 29 U.S.C. 2601-2654 (FMLA statute)
- 29 CFR Part 825 (DOL regulations)
- Employer must provide 12 weeks unpaid leave for qualifying reasons

REQUIRED ANALYSIS:
- Verify employee eligibility (12 months, 1,250 hours, 50+ employees)
- Check notice and certification requirements
- Identify any adverse actions within 30 days of FMLA use
- Review timing of disciplinary actions relative to leave

OUTPUT: Document each violation with statutory citation and evidence.""",
    "termination": """Analyze this document for wrongful termination indicators at Walmart.

DETECTION CRITERIA:
1. Termination following protected activity (FMLA, workers comp, whistleblowing)
2. Pretext indicators (shifting reasons, inconsistent documentation)
3. Disparate treatment compared to non-protected employees
4. Violation of progressive discipline policy
5. Termination during active leave or accommodation request
6. Failure to conduct proper investigation before termination
7. Termination for conduct previously tolerated or common

LEGAL FRAMEWORK:
- Title VII (discrimination)
- ADA (disability discrimination)
- ADEA (age discrimination)
- State wrongful discharge laws
- Retaliation statutes

ANALYZE:
- Timeline of events leading to termination
- Documentation quality and consistency
- Comparator evidence (how others were treated)
- Any protected class or activity involved

OUTPUT: Identify termination issues with supporting evidence and legal citations.""",
    "retaliation": """Analyze this document for workplace retaliation indicators.

DETECTION CRITERIA:
1. Adverse action following protected complaint (HR, OSHA, EEOC)
2. Negative performance reviews after workers comp claim
3. Schedule changes after requesting accommodation
4. Exclusion from opportunities after whistleblowing
5. Increased scrutiny following FMLA usage
6. Demotion or transfer after safety complaint
7. Hostile work environment after protected activity

PROTECTED ACTIVITIES:
- Filing workers compensation claim
- Requesting FMLA leave
- Reporting safety violations (OSHA)
- Reporting discrimination (Title VII)
- Wage and hour complaints (FLSA)
- Reporting illegal activity (whistleblower)

TEMPORAL ANALYSIS:
- Document timeline between protected activity and adverse action
- Close proximity (days/weeks) suggests retaliation
- Pattern of escalating adverse treatment

OUTPUT: List retaliation indicators with timeline and legal framework.""",
}


# Sedgwick Claims Handling Violations
SEDGWICK_PROMPTS: Dict[str, str] = {
    "claims_handling": """Analyze this document for Sedgwick claims handling violations.

DETECTION CRITERIA:
1. Unreasonable delays in claim processing (>30 days without update)
2. Failure to investigate claim thoroughly
3. Ignoring submitted medical evidence
4. Applying wrong legal standard for disability
5. Failure to obtain independent medical examination when appropriate
6. Premature claim closure without proper review
7. Lack of communication with claimant

PROCEDURAL REQUIREMENTS:
- Timely acknowledgment of claim receipt
- Clear explanation of required documentation
- Regular status updates to claimant
- Written explanation for any denial
- Clear appeal rights and procedures

REVIEW:
- Claim timeline and processing dates
- Documentation requests and responses
- Medical evidence consideration
- Communication records

OUTPUT: Document procedural violations with dates and evidence.""",
    "erisa": """Analyze this document for ERISA (Employee Retirement Income Security Act) violations.

DETECTION CRITERIA:
1. Failure to provide Summary Plan Description (SPD)
2. Denial without full and fair review
3. Conflict of interest in claim determination
4. Failure to follow plan document terms
5. Inadequate explanation of denial reasons
6. Arbitrary and capricious decision making
7. Failure to consider all relevant evidence
8. Ignoring treating physician opinions

ERISA REQUIREMENTS (29 U.S.C. 1001 et seq.):
- Written denial with specific reasons (29 CFR 2560.503-1)
- Reference to plan provisions supporting denial
- Description of additional material needed
- Explanation of review procedures
- 180 days to appeal adverse determination

ANALYZE:
- Plan document compliance
- Fiduciary duty adherence
- Procedural regularity
- Substantive reasonableness

OUTPUT: ERISA violations with regulatory citations and remedies.""",
    "denial_patterns": """Analyze this document for improper claim denial patterns.

DETECTION CRITERIA:
1. Denial based on pre-existing condition without proper evidence
2. Cherry-picking medical records (ignoring favorable evidence)
3. Relying on paper review over treating physician
4. Applying higher burden of proof than plan requires
5. Denying based on surveillance without medical correlation
6. Form letter denials without individualized analysis
7. Repeated denials on same grounds after appeal
8. Changing denial reasons between reviews

RED FLAGS:
- Generic denial language copied across claims
- Failure to address claimant's specific medical evidence
- Reliance on independent medical exams by same physician
- Denial despite vocational evidence of disability

DOCUMENT:
- Pattern of denial reasons
- Quality of medical review
- Responsiveness to appeal arguments
- Consistency of standards applied

OUTPUT: Identify denial pattern issues with remediation steps.""",
    "bad_faith": """Analyze this document for insurance bad faith indicators.

DETECTION CRITERIA:
1. Unreasonable delay in processing or paying claims
2. Failure to conduct adequate investigation
3. Denying claims without reasonable basis
4. Failing to explain denial adequately
5. Misrepresenting policy terms or coverage
6. Lowball settlement offers without basis
7. Threatening claimant or using coercive tactics
8. Refusing to pay clear claims promptly

LEGAL STANDARD:
- Insurer must act in good faith and fair dealing
- Must give equal consideration to insured's interests
- Must conduct reasonable investigation
- Must pay valid claims promptly

BAD FAITH INDICATORS:
- Pattern of similar denials
- Ignoring clear medical evidence
- Unreasonable interpretation of policy
- Delay tactics without justification

OUTPUT: Document bad faith indicators with supporting evidence and potential damages.""",
}


# Lincoln Financial LTD Violations
LINCOLN_FINANCIAL_PROMPTS: Dict[str, str] = {
    "ltd_denial": """Analyze this document for improper LTD (Long-Term Disability) denial.

DETECTION CRITERIA:
1. Denial during elimination period without proper evaluation
2. Failure to apply "own occupation" standard correctly
3. Premature transition to "any occupation" standard
4. Ignoring functional capacity evidence
5. Relying on surveillance over medical evidence
6. Denial based on lack of objective findings alone
7. Failure to consider mental health limitations
8. Not crediting subjective pain complaints appropriately

LTD CLAIM FRAMEWORK:
- Elimination period: typically 90-180 days
- Own occupation period: typically 24 months
- Any occupation: requires inability to perform any gainful work
- Residual disability provisions

MEDICAL EVIDENCE REVIEW:
- Treating physician opinions
- Functional capacity evaluations
- Vocational assessments
- Mental health evaluations

OUTPUT: Denial issues with policy provisions and medical evidence.""",
    "erisa_compliance": """Analyze this document for Lincoln Financial ERISA compliance issues.

DETECTION CRITERIA:
1. Failure to provide complete administrative record
2. Inadequate claims review procedures
3. Structural conflict of interest (insurer decides own claims)
4. Failure to follow plan amendment procedures
5. Denial of access to claim file
6. Improper time limits for appeals
7. Failure to identify reviewing physicians
8. Not considering Social Security disability findings

ERISA PROCEDURAL REQUIREMENTS:
- Full and fair review of denied claims
- Written notice of denial with specific reasons
- Opportunity to submit written comments
- Review of all comments and documents
- Decision by appropriate named fiduciary

DOCUMENT:
- Procedural timeline compliance
- Completeness of claim file provided
- Quality of review process
- Consideration of all evidence

OUTPUT: ERISA procedural violations with remediation strategy.""",
    "benefit_calculation": """Analyze this document for LTD benefit calculation errors.

DETECTION CRITERIA:
1. Incorrect pre-disability earnings calculation
2. Improper offset for other income (Social Security, workers comp)
3. Failure to apply cost of living adjustments (COLA)
4. Incorrect calculation of partial disability benefits
5. Improper reduction for retirement income
6. Errors in benefit percentage application
7. Failure to pay retroactive benefits

CALCULATION COMPONENTS:
- Pre-disability earnings: typically 12-month average
- Benefit percentage: commonly 60% of pre-disability earnings
- Maximum monthly benefit: policy cap
- Minimum monthly benefit: policy floor
- Offset sources: SSDI, workers comp, pension

VERIFY:
- Earnings documentation used
- Offset calculations accuracy
- Benefit formula application
- Payment history review

OUTPUT: Calculation errors with correct amounts and policy provisions.""",
}


# SC Family Law Violations
SC_FAMILY_LAW_PROMPTS: Dict[str, str] = {
    "custody": """Analyze this document for child custody issues under SC law.

DETECTION CRITERIA:
1. Failure to consider best interests of child factors
2. Ignoring guardian ad litem recommendations without explanation
3. Modification without showing substantial change in circumstances
4. Parental alienation indicators
5. Failure to enforce existing custody orders
6. Improper consideration of protected characteristics
7. Denial of visitation without cause
8. Relocation without proper notice/consent

SC CUSTODY FRAMEWORK (SC Code Ann. 63-15-10 et seq.):
- Best interests of child is paramount
- Joint custody presumption in certain circumstances
- Factors: child's preference, parent fitness, stability, relationships
- Modification requires substantial change affecting child welfare

ANALYZE:
- Application of statutory factors
- Evidence consideration quality
- Procedural compliance
- Order clarity and enforceability

OUTPUT: Custody issues with SC Code citations and recommendations.""",
    "child_support": """Analyze this document for child support calculation issues.

DETECTION CRITERIA:
1. Incorrect gross income calculation
2. Failure to impute income for voluntarily unemployed parent
3. Improper application of child support guidelines
4. Failure to include all income sources
5. Incorrect adjustment for other children
6. Improper health insurance allocation
7. Failure to address extraordinary expenses
8. Modification without proper showing

SC CHILD SUPPORT GUIDELINES (SC Code Ann. 63-17-470):
- Income shares model
- Both parents' gross income considered
- Adjustments for: custody arrangement, health insurance, childcare
- Deviation requires written findings

CALCULATION REVIEW:
- Income documentation completeness
- Guidelines application accuracy
- Deviation justification adequacy
- Enforcement provisions

OUTPUT: Support calculation issues with correct amounts and guideline citations.""",
    "procedural": """Analyze this document for SC Family Court procedural issues.

DETECTION CRITERIA:
1. Improper service of process
2. Failure to provide required financial declarations
3. Violation of discovery rules
4. Improper ex parte communications
5. Failure to follow temporary order procedures
6. Contempt proceedings without proper notice
7. Appeal deadline violations
8. Improper modification procedures

SC FAMILY COURT RULES:
- Service requirements (SCRCP Rule 4)
- Discovery procedures (SCRCP Rules 26-37)
- Motion practice (SCRCP Rule 7)
- Temporary relief procedures (SCRCP Rule 65)
- Appeal deadlines (30 days, SCACR Rule 203)

PROCEDURAL REVIEW:
- Filing and service compliance
- Notice requirements met
- Hearing procedures followed
- Order entry timeliness

OUTPUT: Procedural violations with rule citations and remedies.""",
}


# SC Unemployment Violations
SC_UNEMPLOYMENT_PROMPTS: Dict[str, str] = {
    "eligibility": """Analyze this document for SC unemployment eligibility issues.

DETECTION CRITERIA:
1. Improper disqualification for misconduct
2. Failure to meet base period wage requirements
3. Incorrect determination of able and available status
4. Improper good cause determination for voluntary quit
5. Failure to credit all qualifying wages
6. Incorrect benefit amount calculation
7. Improper disqualification period assessment
8. Failure to consider mitigating circumstances

SC UNEMPLOYMENT LAW (SC Code Ann. Title 41):
- Base period: first 4 of last 5 completed quarters
- Monetary eligibility: wages in 2+ quarters, minimum amounts
- Misconduct: willful or wanton disregard of employer's interests
- Good cause: reasonable person standard

ELIGIBILITY REVIEW:
- Wage record accuracy
- Separation circumstances analysis
- Availability determination basis
- Disqualification justification

OUTPUT: Eligibility issues with SC Code citations and appeal points.""",
    "appeals": """Analyze this document for SC unemployment appeal issues.

DETECTION CRITERIA:
1. Appeal filed outside 14-day deadline without good cause
2. Failure to provide fair hearing
3. Improper burden of proof allocation
4. Failure to consider all relevant evidence
5. Decision not supported by substantial evidence
6. Procedural irregularities at hearing
7. Failure to apply correct legal standard
8. Improper credibility determinations

SC APPEALS PROCESS:
- Initial determination by DEW
- Appeal to Appeals Tribunal within 14 days
- Further appeal to Appellate Panel
- Judicial review to Circuit Court/Court of Appeals

HEARING REVIEW:
- Notice adequacy
- Opportunity to present evidence
- Cross-examination rights
- Findings of fact support

OUTPUT: Appeal issues with procedural remedies and strategic recommendations.""",
    "documentation": """Analyze this document for unemployment documentation issues.

DETECTION CRITERIA:
1. Missing or incomplete separation documentation
2. Insufficient evidence of misconduct
3. Failure to document warnings or progressive discipline
4. Inconsistent employer statements
5. Missing witness statements
6. Inadequate records of work search
7. Failure to document medical restrictions
8. Missing wage records

DOCUMENTATION REQUIREMENTS:
- Employer: separation notice, policy documents, investigation records
- Claimant: work search log, availability documentation, medical records
- DEW: interview notes, determination rationale

EVIDENCE REVIEW:
- Documentary evidence completeness
- Hearsay issues
- Best evidence rule compliance
- Authentication requirements

OUTPUT: Documentation gaps with impact on claim and remediation steps.""",
}


# SC Employment Law Violations
SC_EMPLOYMENT_PROMPTS: Dict[str, str] = {
    "wrongful_termination": """Analyze this document for SC wrongful termination issues.

DETECTION CRITERIA:
1. Termination violating public policy
2. Breach of implied contract from handbook/policies
3. Termination in retaliation for protected activity
4. Discriminatory termination (race, sex, age, disability, religion)
5. Termination during FMLA or workers comp leave
6. Failure to follow progressive discipline policy
7. Pretextual reasons for termination
8. Constructive discharge through intolerable conditions

SC EMPLOYMENT LAW:
- At-will employment doctrine applies
- Exceptions: public policy, implied contract, statutory protections
- SC Human Affairs Law (SC Code Ann. 1-13-10 et seq.)
- Federal protections: Title VII, ADA, ADEA, FMLA

ANALYZE:
- Termination reasons and documentation
- Timeline and suspicious timing
- Comparator treatment
- Policy compliance

OUTPUT: Termination issues with legal theories and evidence assessment.""",
    "discrimination": """Analyze this document for employment discrimination under SC law.

DETECTION CRITERIA:
1. Disparate treatment based on protected class
2. Disparate impact of facially neutral policies
3. Hostile work environment based on protected characteristic
4. Failure to accommodate disability or religion
5. Pregnancy discrimination
6. Age-based adverse actions (40+)
7. Sexual harassment (quid pro quo or hostile environment)
8. Retaliation for opposing discrimination

LEGAL FRAMEWORK:
- SC Human Affairs Law
- Title VII of Civil Rights Act
- Americans with Disabilities Act
- Age Discrimination in Employment Act
- Pregnancy Discrimination Act

EVIDENCE ANALYSIS:
- Direct evidence of discriminatory intent
- Circumstantial evidence (McDonnell Douglas framework)
- Comparator analysis
- Statistical evidence if applicable

OUTPUT: Discrimination findings with legal framework and evidence gaps.""",
    "wage_violations": """Analyze this document for wage and hour violations.

DETECTION CRITERIA:
1. Failure to pay minimum wage
2. Overtime violations (misclassification, off-clock work)
3. Improper deductions from wages
4. Failure to pay final wages timely
5. Misclassification as independent contractor
6. Tip credit violations
7. Failure to maintain accurate time records
8. Unauthorized deductions (breakage, shortages)

LEGAL FRAMEWORK:
- Fair Labor Standards Act (29 U.S.C. 201 et seq.)
- SC Payment of Wages Act (SC Code Ann. 41-10-10 et seq.)
- Federal minimum wage: $7.25/hour (as of knowledge cutoff)
- Overtime: 1.5x regular rate for hours over 40/week

CALCULATION REVIEW:
- Hours worked documentation
- Rate of pay accuracy
- Overtime calculation method
- Deduction authorization

OUTPUT: Wage violations with amounts owed and statutory penalties.""",
}


# Combined violation prompts dictionary
VIOLATION_PROMPTS: Dict[str, Dict[str, str]] = {
    "walmart_dc": WALMART_DC_PROMPTS,
    "sedgwick": SEDGWICK_PROMPTS,
    "lincoln_financial": LINCOLN_FINANCIAL_PROMPTS,
    "sc_family_law": SC_FAMILY_LAW_PROMPTS,
    "sc_unemployment": SC_UNEMPLOYMENT_PROMPTS,
    "sc_employment": SC_EMPLOYMENT_PROMPTS,
}


def get_violation_prompt(domain: str, violation_type: str) -> Optional[str]:
    """
    Get a specific violation detection prompt.

    Args:
        domain: Legal domain (walmart_dc, sedgwick, lincoln_financial, etc.)
        violation_type: Type of violation to detect (attendance, fmla, claims, etc.)

    Returns:
        Prompt string if found, None otherwise

    Example:
        >>> prompt = get_violation_prompt("walmart_dc", "fmla")
        >>> print(prompt[:50])
        'Analyze this document for FMLA (Family Medical Lea'
    """
    domain_prompts = VIOLATION_PROMPTS.get(domain.lower(), {})
    return domain_prompts.get(violation_type.lower())


def get_all_violation_categories(domain: str) -> List[str]:
    """
    Get all available violation categories for a domain.

    Args:
        domain: Legal domain

    Returns:
        List of violation type strings available for the domain

    Example:
        >>> categories = get_all_violation_categories("walmart_dc")
        >>> print(categories)
        ['attendance', 'fmla', 'termination', 'retaliation']
    """
    domain_prompts = VIOLATION_PROMPTS.get(domain.lower(), {})
    return list(domain_prompts.keys())


def get_combined_violation_prompt(domain: str) -> str:
    """
    Get a combined prompt for all violation types in a domain.

    Useful for comprehensive document analysis that checks for
    all possible violations in a single pass.

    Args:
        domain: Legal domain

    Returns:
        Combined prompt string with all violation categories

    Example:
        >>> prompt = get_combined_violation_prompt("sedgwick")
        >>> "claims_handling" in prompt.lower()
        True
    """
    domain_prompts = VIOLATION_PROMPTS.get(domain.lower(), {})

    if not domain_prompts:
        return f"Analyze this document for legal violations in the {domain} domain."

    combined_parts = [
        f"Analyze this document comprehensively for {domain.upper()} violations.\n",
        "Check for the following violation categories:\n",
    ]

    for i, (category, prompt) in enumerate(domain_prompts.items(), 1):
        # Extract just the detection criteria from each prompt
        combined_parts.append(f"\n--- {i}. {category.upper().replace('_', ' ')} ---\n")
        combined_parts.append(prompt)

    combined_parts.append(
        "\n\n--- SUMMARY OUTPUT ---\n"
        "Provide a consolidated list of all violations found, organized by category, "
        "with evidence citations and severity ratings for each."
    )

    return "".join(combined_parts)
