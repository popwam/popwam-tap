package com.popwam.pop.ui

import com.popwam.pop.data.api.ProfileBootstrapTemplateDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProfileBootstrapPolicyTest {
    private val templates=listOf(ProfileBootstrapTemplateDto(id="personal-template"))
    @Test fun `personal category and compatible template can submit`()=assertNull(bootstrapValidationError("Ada","PERSONAL","creator",templates,"personal-template"))
    @Test fun `business category and compatible template can submit`()=assertNull(bootstrapValidationError("POP Ltd","BUSINESS","retail",templates,"personal-template"))
    @Test fun `invalid server category cannot submit locally`()=assertEquals("PROFILE_CATEGORY_REQUIRED",bootstrapValidationError("Ada","PERSONAL",null,templates,"personal-template"))
    @Test fun `invalid template cannot submit locally`()=assertEquals("PROFILE_TEMPLATE_INCOMPATIBLE",bootstrapValidationError("Ada","PERSONAL","creator",templates,"other-template"))
    @Test fun `unavailable templates hold bootstrap safely`()=assertEquals("PROFILE_TEMPLATES_UNAVAILABLE",bootstrapValidationError("Ada","PERSONAL","creator",emptyList(),null))
}
