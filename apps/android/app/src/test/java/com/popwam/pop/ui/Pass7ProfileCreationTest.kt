package com.popwam.pop.ui
import com.popwam.pop.data.api.*
import com.popwam.pop.data.auth.*
import com.popwam.pop.data.repository.AuthSetupRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.*
import org.junit.Assert.*
import java.lang.reflect.Proxy

@OptIn(ExperimentalCoroutinesApi::class)
class Pass7ProfileCreationTest {
    private val dispatcher=StandardTestDispatcher()
    @Before fun before(){Dispatchers.setMain(dispatcher)}
    @After fun after(){Dispatchers.resetMain()}
    private class Store:SessionStore {
        var value:SessionTokens?=SessionTokens("access","refresh","user","USER")
        override fun snapshot()=value
        override suspend fun load()=value
        override suspend fun save(tokens:SessionTokens){value=tokens}
        override suspend fun clear(){value=null}
    }
    private fun <T> proxy(type:Class<T>,handler:(String,Array<out Any?>)->Any?):T=type.cast(Proxy.newProxyInstance(type.classLoader,arrayOf(type)){_,method,args->handler(method.name,args?:emptyArray())})
    @Test fun `first profile is saved before unavailable template catalog and resumes after restart`()=runTest(dispatcher){
        var created=false;val calls=mutableListOf<String>()
        val status=ProfileBootstrapStatusResponse(ok=true,accountName="Ada",accountKind="PERSONAL",legalReady=true,legalAccepted=true)
        val api=proxy(PopwamApi::class.java){name,args->calls+=name;when(name){
            "profileBootstrapStatus"->status.copy(hasPrimaryProfile=created,primaryProfileId=if(created)"profile" else null,setupStep=if(created)"TEMPLATE" else null)
            "submitProfileBootstrap"->{val body=args[0] as ProfileBootstrapRequest;assertEquals("PERSONAL",body.profileKind);assertNull(body.templateId);created=true;ProfileBootstrapResponse(ok=true)}
            "templates"->throw java.io.IOException("catalog unavailable")
            else->ApiResult(ok=true)
        }}
        val sessions=SessionRepository(proxy(AuthApi::class.java){_,_->error("Unexpected auth request")},Store())
        val analytics=object:PopAnalytics{override fun track(event:String,properties:Map<String,String>){}}
        val vm=AuthViewModel(sessions,AuthSetupRepository(api),analytics)
        vm.refreshSetup("en");runCurrent();assertEquals(AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED,vm.state.value.setupStage)
        vm.submitBootstrap("en");vm.submitBootstrap("en");runCurrent()
        assertTrue(created);assertEquals(1,calls.count{it=="submitProfileBootstrap"});assertTrue(calls.indexOf("submitProfileBootstrap")<calls.indexOf("templates"))
        assertEquals(AuthSetupStage.TEMPLATE_CHOICE,vm.state.value.setupStage);assertTrue(vm.state.value.catalogUnavailable)
        val restored=AuthViewModel(sessions,AuthSetupRepository(api),analytics);restored.refreshSetup("en");runCurrent();assertEquals(AuthSetupStage.TEMPLATE_CHOICE,restored.state.value.setupStage)
        restored.continueToSecurity();runCurrent();assertEquals(AuthSetupStage.SECURITY_SETUP,restored.state.value.setupStage)
    }
    @Test fun `locked template is never submitted`()=runTest(dispatcher){
        var mutations=0
        val api=proxy(PopwamApi::class.java){name,_->when(name){
            "profileBootstrapStatus"->ProfileBootstrapStatusResponse(ok=true,accountName="Ada",accountKind="PERSONAL",legalReady=true,legalAccepted=true,hasPrimaryProfile=true,primaryProfileId="profile",setupStep="TEMPLATE")
            "templates"->TemplatesResponse(ok=true,templates=listOf(ProfileTemplateDto(id="locked",profileKind="PERSONAL",allowed=false)))
            "mutateProfileEditor"->{mutations++;ApiResult(ok=true)}
            else->error("Unexpected request: $name")
        }}
        val vm=AuthViewModel(SessionRepository(proxy(AuthApi::class.java){_,_->error("auth")},Store()),AuthSetupRepository(api),object:PopAnalytics{override fun track(event:String,properties:Map<String,String>){}})
        vm.refreshSetup("en");runCurrent();vm.selectTemplate("locked","en");runCurrent();assertEquals(0,mutations);assertNotNull(vm.state.value.error)
    }
}
